const ServiceRequest = require('../models/ServiceRequest');
const Reservation    = require('../models/Reservation');
const Guest          = require('../models/Guest');
const Room           = require('../models/Room');
const User           = require('../models/User');
const { AppError }    = require('../middleware/errorHandler');
const catchAsync      = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const populateRequest = (query) =>
  query
    .populate('guest',       'firstName lastName email isVIP')
    .populate('reservation', 'bookingId checkInDate checkOutDate status')
    .populate('room',        'roomNumber floor type typeLabel')
    .populate('assignedTo',  'name email role');

const buildPayload = (s) => ({
  id:               s._id,
  guest:            s.guest,
  reservation:      s.reservation,
  room:             s.room,
  serviceType:      s.serviceType,
  serviceTypeLabel: s.serviceTypeLabel,
  details:          s.details         || null,
  priority:         s.priority,
  scheduledFor:     s.scheduledFor    || null,
  requestedAt:      s.requestedAt,
  status:           s.status,
  assignedTo:       s.assignedTo      || null,
  fulfilledAt:      s.fulfilledAt     || null,
  responseMinutes:  s.responseMinutes,
  notes:            s.notes           || null,
  createdAt:        s.createdAt,
  updatedAt:        s.updatedAt,
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/services
 * Access: admin, manager, receptionist (staff create on behalf of guest)
 */
exports.createServiceRequest = catchAsync(async (req, res, next) => {
  const {
    guest: guestId, reservation: reservationId, room: roomId,
    serviceType, details, priority, scheduledFor,
  } = req.body;

  validateObjectId(guestId,        'Guest ID');
  validateObjectId(reservationId,  'Reservation ID');
  validateObjectId(roomId,         'Room ID');

  const [guest, reservation, room] = await Promise.all([
    Guest.findById(guestId),
    Reservation.findById(reservationId),
    Room.findById(roomId),
  ]);

  if (!guest)        return next(new AppError('Guest not found.', 404));
  if (!reservation)  return next(new AppError('Reservation not found.', 404));
  if (!room)         return next(new AppError('Room not found.', 404));

  if (reservation.guest.toString() !== guestId) {
    return next(new AppError('This reservation does not belong to the specified guest.', 400));
  }
  if (reservation.status !== 'checked-in') {
    return next(new AppError('Service requests can only be created for guests who are currently checked-in.', 400));
  }

  const serviceRequest = await ServiceRequest.create({
    guest:       guestId,
    reservation: reservationId,
    room:        roomId,
    serviceType,
    details,
    priority:    priority    || 'medium',
    scheduledFor:scheduledFor ? new Date(scheduledFor) : null,
    requestedAt: new Date(),
  });

  const populated = await populateRequest(ServiceRequest.findById(serviceRequest._id));

  sendSuccess(res, 201, `${populated.serviceTypeLabel} request created for room ${room.roomNumber}.`, {
    serviceRequest: buildPayload(populated),
  });
});

/**
 * GET /api/services
 * Access: admin, manager, receptionist
 * Supports ?status=&serviceType=&guestId=&roomId=&assignedTo=&page=&limit=&sort=
 */
exports.getAllServiceRequests = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, serviceType, guestId, roomId, assignedTo, sort } = req.query;

  const filter = {};
  if (status)      filter.status      = status;
  if (serviceType) filter.serviceType = serviceType;
  if (guestId)     { validateObjectId(guestId,    'Guest ID');  filter.guest      = guestId; }
  if (roomId)      { validateObjectId(roomId,      'Room ID');   filter.room       = roomId; }
  if (assignedTo)  { validateObjectId(assignedTo,  'Staff ID');  filter.assignedTo = assignedTo; }

  const sortMap = {
    newest:    { createdAt: -1 },
    scheduled: { scheduledFor: 1 },
    priority:  { priority: -1, createdAt: -1 },
    status:    { status: 1, priority: -1 },
  };
  const sortOrder = sortMap[sort] || sortMap.newest;

  const [requests, totalCount] = await Promise.all([
    populateRequest(ServiceRequest.find(filter).sort(sortOrder).skip(skip).limit(limit)),
    ServiceRequest.countDocuments(filter),
  ]);

  // Service type counts — useful for "Spa visits: 1/3" style display in FE
  const typeCounts = await ServiceRequest.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: '$serviceType', count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]);

  sendSuccess(
    res,
    200,
    'Service requests retrieved.',
    {
      serviceRequests: requests.map(buildPayload),
      typeCounts: typeCounts.reduce((acc, t) => { acc[t._id] = t.count; return acc; }, {}),
    },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/services/:id
 * Access: admin, manager, receptionist
 */
exports.getServiceRequestById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Service Request ID');

  const serviceRequest = await populateRequest(ServiceRequest.findById(req.params.id));
  if (!serviceRequest) return next(new AppError('Service request not found.', 404));

  sendSuccess(res, 200, 'Service request retrieved.', { serviceRequest: buildPayload(serviceRequest) });
});

/**
 * PATCH /api/services/:id
 * General update — details, priority, scheduledFor, notes.
 * Status and assignment have dedicated endpoints.
 * Access: admin, manager, receptionist
 */
exports.updateServiceRequest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Service Request ID');

  const serviceRequest = await ServiceRequest.findById(req.params.id);
  if (!serviceRequest) return next(new AppError('Service request not found.', 404));

  if (['fulfilled', 'cancelled'].includes(serviceRequest.status)) {
    return next(new AppError(`Cannot update a ${serviceRequest.status} service request.`, 400));
  }

  const allowedFields = ['details', 'priority', 'scheduledFor', 'notes'];
  const updateFields  = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updateFields[f] = req.body[f]; });

  if (updateFields.scheduledFor) updateFields.scheduledFor = new Date(updateFields.scheduledFor);
  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const updated = await populateRequest(
    ServiceRequest.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true })
  );

  sendSuccess(res, 200, 'Service request updated.', { serviceRequest: buildPayload(updated) });
});

/**
 * PATCH /api/services/:id/cancel
 * Soft-cancel — only pending requests can be cancelled.
 * Access: admin, manager, receptionist
 */
exports.cancelServiceRequest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Service Request ID');

  const serviceRequest = await ServiceRequest.findById(req.params.id);
  if (!serviceRequest) return next(new AppError('Service request not found.', 404));

  if (serviceRequest.status !== 'pending') {
    return next(new AppError(`Only pending requests can be cancelled. Current status: "${serviceRequest.status}".`, 400));
  }

  serviceRequest.status = 'cancelled';
  await serviceRequest.save();

  const populated = await populateRequest(ServiceRequest.findById(serviceRequest._id));

  sendSuccess(res, 200, 'Service request cancelled.', { serviceRequest: buildPayload(populated) });
});

/**
 * PATCH /api/services/:id/assign
 * Assigns request to a staff member and transitions to in-progress.
 * Access: admin, manager, receptionist
 */
exports.assignServiceRequest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Service Request ID');

  const { assignedTo } = req.body;
  if (!assignedTo) return next(new AppError('assignedTo (User ID) is required.', 400));

  validateObjectId(assignedTo, 'Assigned User ID');

  const [serviceRequest, staff] = await Promise.all([
    ServiceRequest.findById(req.params.id),
    User.findById(assignedTo),
  ]);

  if (!serviceRequest) return next(new AppError('Service request not found.', 404));
  if (!staff)          return next(new AppError('Staff member not found.', 404));

  if (['fulfilled', 'cancelled'].includes(serviceRequest.status)) {
    return next(new AppError(`Cannot assign a ${serviceRequest.status} request.`, 400));
  }

  serviceRequest.assignedTo = assignedTo;
  if (serviceRequest.status === 'pending') serviceRequest.status = 'in-progress';
  await serviceRequest.save();

  const populated = await populateRequest(ServiceRequest.findById(serviceRequest._id));

  sendSuccess(res, 200, `Request assigned to ${staff.name}.`, { serviceRequest: buildPayload(populated) });
});

/**
 * PATCH /api/services/:id/fulfill
 * Marks a service request as fulfilled.
 * Access: admin, manager, receptionist
 */
exports.fulfillServiceRequest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Service Request ID');

  const serviceRequest = await ServiceRequest.findById(req.params.id);
  if (!serviceRequest) return next(new AppError('Service request not found.', 404));

  if (serviceRequest.status === 'fulfilled') {
    return next(new AppError('This request has already been fulfilled.', 400));
  }
  if (serviceRequest.status === 'cancelled') {
    return next(new AppError('Cannot fulfil a cancelled request.', 400));
  }

  const { notes } = req.body;
  serviceRequest.status      = 'fulfilled';
  serviceRequest.fulfilledAt = new Date();
  if (notes !== undefined) serviceRequest.notes = notes;
  await serviceRequest.save();

  const populated = await populateRequest(ServiceRequest.findById(serviceRequest._id));

  sendSuccess(res, 200, `${populated.serviceTypeLabel} request fulfilled in ${populated.responseMinutes ?? '—'} minute(s).`, {
    serviceRequest: buildPayload(populated),
  });
});
