const MaintenanceRequest = require('../models/MaintenanceRequest');
const Room  = require('../models/Room');
const User  = require('../models/User');
const { AppError }    = require('../middleware/errorHandler');
const catchAsync      = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAINTENANCE_ROLES = ['admin', 'manager', 'service'];

const populateRequest = (query) =>
  query
    .populate('room',       'roomNumber floor type typeLabel status')
    .populate('reportedBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('statusLog.updatedBy', 'name role');

const buildPayload = (r) => ({
  id:              r._id,
  requestId:       r.requestId,
  room:            r.room            || null,
  location:        r.location        || null,
  displayLocation: r.displayLocation,
  reportedBy:      r.reportedBy,
  category:        r.category,
  description:     r.description,
  photos:          r.photos,
  priority:        r.priority,
  status:          r.status,
  assignedTo:      r.assignedTo      || null,
  resolutionNote:  r.resolutionNote  || null,
  resolvedAt:      r.resolvedAt      || null,
  resolutionHours: r.resolutionHours,
  statusLog:       r.statusLog,
  createdAt:       r.createdAt,
  updatedAt:       r.updatedAt,
});

// Append an entry to the status audit log
const appendStatusLog = (request, status, userId, note = '') => {
  request.statusLog.push({ status, updatedBy: userId, note, timestamp: new Date() });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/maintenance
 * Access: all authenticated staff (anyone can report an issue)
 */
exports.createRequest = catchAsync(async (req, res, next) => {
  const { room: roomId, location, category, description, photos, priority } = req.body;

  // Must supply either a room ref or a location string
  if (!roomId && !location) {
    return next(new AppError('Either a room ID or a location description is required.', 400));
  }

  let room = null;
  if (roomId) {
    validateObjectId(roomId, 'Room ID');
    room = await Room.findById(roomId);
    if (!room) return next(new AppError('Room not found.', 404));
  }

  const request = new MaintenanceRequest({
    room:        roomId || null,
    location:    location || null,
    reportedBy:  req.user.id,
    category,
    description,
    photos:      photos || [],
    priority:    priority || 'medium',
  });

  appendStatusLog(request, 'open', req.user.id, 'Request created.');
  await request.save();

  // If the room is available or occupied, flag it for awareness (don't auto-change status)
  // Maintenance status change happens via updateStatus when engineer starts work

  const populated = await populateRequest(MaintenanceRequest.findById(request._id));

  sendSuccess(res, 201, `Maintenance request ${request.requestId} created.`, {
    request: buildPayload(populated),
  });
});

/**
 * GET /api/maintenance
 * Access: admin, manager, maintenance
 * Supports ?status=&priority=&category=&assignedTo=&roomId=&page=&limit=&sort=
 */
exports.getAllRequests = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, priority, category, assignedTo, roomId, sort } = req.query;

  const filter = {};
  if (status)     filter.status   = status;
  if (priority)   filter.priority = priority;
  if (category)   filter.category = category;
  if (assignedTo) { validateObjectId(assignedTo, 'Staff ID'); filter.assignedTo = assignedTo; }
  if (roomId)     { validateObjectId(roomId, 'Room ID');      filter.room       = roomId; }

  const sortMap = {
    priority:  { priority: -1, createdAt: -1 },
    newest:    { createdAt: -1 },
    oldest:    { createdAt:  1 },
    status:    { status: 1, priority: -1 },
  };
  const sortOrder = sortMap[sort] || sortMap.priority;

  const [requests, totalCount] = await Promise.all([
    populateRequest(MaintenanceRequest.find(filter).sort(sortOrder).skip(skip).limit(limit)),
    MaintenanceRequest.countDocuments(filter),
  ]);

  // Stats for FE header bar: Open / In progress / Resolved today / Avg. resolution
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [openCount, inProgressCount, resolvedTodayCount, avgResolution] = await Promise.all([
    MaintenanceRequest.countDocuments({ status: 'open' }),
    MaintenanceRequest.countDocuments({ status: { $in: ['assigned', 'in-progress'] } }),
    MaintenanceRequest.countDocuments({ status: 'resolved', resolvedAt: { $gte: todayStart, $lte: todayEnd } }),
    MaintenanceRequest.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
      { $project: { resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] } } },
      { $group:   { _id: null, avgMs: { $avg: '$resolutionMs' } } },
    ]),
  ]);

  const avgHours = avgResolution[0]
    ? +((avgResolution[0].avgMs / (1000 * 60 * 60)).toFixed(1))
    : null;

  sendSuccess(
    res,
    200,
    'Maintenance requests retrieved.',
    {
      requests: requests.map(buildPayload),
      stats: {
        open:          openCount,
        inProgress:    inProgressCount,
        resolvedToday: resolvedTodayCount,
        avgResolutionHours: avgHours,
      },
    },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/maintenance/:id
 * Access: admin, manager, maintenance
 */
exports.getRequestById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Request ID');

  const request = await populateRequest(MaintenanceRequest.findById(req.params.id));
  if (!request) return next(new AppError('Maintenance request not found.', 404));

  sendSuccess(res, 200, 'Request retrieved.', { request: buildPayload(request) });
});

/**
 * PATCH /api/maintenance/:id
 * General update — category, description, photos, priority, location.
 * Status, assignment, and resolution have dedicated endpoints.
 * Access: admin, manager, maintenance
 */
exports.updateRequest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Request ID');

  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) return next(new AppError('Maintenance request not found.', 404));

  if (request.status === 'resolved') {
    return next(new AppError('Cannot update a resolved maintenance request.', 400));
  }

  const allowedFields = ['category', 'description', 'photos', 'priority', 'location'];
  const updateFields  = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updateFields[f] = req.body[f];
  });

  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const updated = await populateRequest(
    MaintenanceRequest.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true })
  );

  sendSuccess(res, 200, `Request ${updated.requestId} updated.`, { request: buildPayload(updated) });
});

/**
 * PATCH /api/maintenance/:id/assign
 * Assigns request to a maintenance staff member → status becomes 'assigned'.
 * Access: admin, manager
 */
exports.assignRequest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Request ID');

  const { assignedTo, note } = req.body;
  if (!assignedTo) return next(new AppError('assignedTo (User ID) is required.', 400));

  validateObjectId(assignedTo, 'Assigned User ID');

  const [request, staff] = await Promise.all([
    MaintenanceRequest.findById(req.params.id),
    User.findById(assignedTo),
  ]);

  if (!request) return next(new AppError('Maintenance request not found.', 404));
  if (!staff)   return next(new AppError('Staff member not found.', 404));

  if (!MAINTENANCE_ROLES.includes(staff.role)) {
    return next(new AppError('Requests can only be assigned to admin, manager, or maintenance staff.', 400));
  }
  if (request.status === 'resolved') {
    return next(new AppError('Cannot reassign a resolved request.', 400));
  }

  request.assignedTo = assignedTo;
  request.status     = 'assigned';
  appendStatusLog(request, 'assigned', req.user.id, note || `Assigned to ${staff.name}.`);
  await request.save();

  const populated = await populateRequest(MaintenanceRequest.findById(request._id));

  sendSuccess(res, 200, `Request ${request.requestId} assigned to ${staff.name}.`, {
    request: buildPayload(populated),
  });
});

/**
 * PATCH /api/maintenance/:id/status
 * Transitions status through the workflow: open → assigned → in-progress → resolved.
 * Access: admin, manager, maintenance
 */
exports.updateStatus = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Request ID');

  const { status, note } = req.body;
  const validStatuses = ['open', 'assigned', 'in-progress', 'resolved'];

  if (!status) return next(new AppError('Status is required.', 400));
  if (!validStatuses.includes(status)) {
    return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}.`, 400));
  }

  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) return next(new AppError('Maintenance request not found.', 404));

  if (request.status === 'resolved' && status !== 'open') {
    return next(new AppError('A resolved request can only be reopened (status: open).', 400));
  }

  const previousStatus = request.status;
  request.status = status;

  if (status === 'resolved') {
    request.resolvedAt = new Date();
    // Also free the room from maintenance status if it was in maintenance
    if (request.room) {
      await Room.findOneAndUpdate(
        { _id: request.room, status: 'maintenance' },
        { status: 'cleaning', lastStatusChange: new Date(), statusNote: `Maintenance resolved: ${request.requestId}` }
      );
    }
  }

  if (status === 'open' && previousStatus === 'resolved') {
    request.resolvedAt = null;
  }

  appendStatusLog(request, status, req.user.id, note || '');
  await request.save();

  const populated = await populateRequest(MaintenanceRequest.findById(request._id));

  sendSuccess(res, 200, `Request ${request.requestId} status updated from "${previousStatus}" to "${status}".`, {
    request: buildPayload(populated),
  });
});

/**
 * PATCH /api/maintenance/:id/resolve
 * Convenience endpoint — marks resolved with a required resolution note.
 * Access: admin, manager, maintenance
 */
exports.resolveRequest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Request ID');

  const { resolutionNote, note } = req.body;
  if (!resolutionNote || !resolutionNote.trim()) {
    return next(new AppError('A resolution note is required when resolving a request.', 400));
  }

  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) return next(new AppError('Maintenance request not found.', 404));

  if (request.status === 'resolved') {
    return next(new AppError('This request is already resolved.', 400));
  }

  request.status         = 'resolved';
  request.resolutionNote = resolutionNote.trim();
  request.resolvedAt     = new Date();

  appendStatusLog(request, 'resolved', req.user.id, note || resolutionNote.trim());

  // Free the room from maintenance status
  if (request.room) {
    await Room.findOneAndUpdate(
      { _id: request.room, status: 'maintenance' },
      { status: 'cleaning', lastStatusChange: new Date(), statusNote: `Maintenance resolved: ${request.requestId}` }
    );
  }

  await request.save();

  const populated = await populateRequest(MaintenanceRequest.findById(request._id));

  sendSuccess(res, 200, `Request ${request.requestId} resolved.`, {
    request: buildPayload(populated),
  });
});
