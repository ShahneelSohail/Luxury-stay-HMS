const mongoose = require('mongoose');
const Guest = require('../models/Guest');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// Lazy model references to avoid circular deps
const getReservation = () => mongoose.model('Reservation');

const escapeRegex = (v = '') => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildNameFilter(q) {
  const re = { $regex: escapeRegex(q), $options: 'i' };
  const conditions = [
    { firstName: re },
    { lastName:  re },
    { email:     re },
    { phone:     re },
  ];
  if (q.includes(' ')) {
    const parts = q.trim().split(/\s+/);
    const r0 = { $regex: escapeRegex(parts[0]),                  $options: 'i' };
    const r1 = { $regex: escapeRegex(parts.slice(1).join(' ')),  $options: 'i' };
    conditions.push({ firstName: r0, lastName: r1 }, { firstName: r1, lastName: r0 });
  }
  return { $or: conditions };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildGuestPayload = (guest, extra = {}) => ({
  id:            guest._id,
  firstName:     guest.firstName,
  lastName:      guest.lastName,
  fullName:      guest.fullName,
  email:         guest.email,
  phone:         guest.phone,
  nationality:   guest.nationality   || null,
  idType:        guest.idType        || null,
  idNumber:      guest.idNumber      || null,
  address:       guest.address,
  preferences:   guest.preferences,
  totalStays:    guest.totalStays,
  tier:          guest.tier,
  tierLabel:     guest.tierLabel,
  lifetimeSpend: guest.lifetimeSpend,
  isVIP:         guest.isVIP,
  createdAt:     guest.createdAt,
  updatedAt:     guest.updatedAt,
  ...extra,
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/guests
 * Access: admin, manager, receptionist
 */
exports.createGuest = catchAsync(async (req, res, next) => {
  const {
    firstName, lastName, email, phone, nationality,
    idType, idNumber, address, preferences, tier, lifetimeSpend,
  } = req.body;

  const existing = await Guest.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError('A guest profile with this email already exists.', 400));
  }

  const guest = await Guest.create({
    firstName, lastName, email, phone, nationality,
    idType, idNumber, address, preferences,
    tier:          tier          || 'none',
    lifetimeSpend: lifetimeSpend || 0,
  });

  sendSuccess(res, 201, 'Guest profile created successfully.', {
    guest: buildGuestPayload(guest),
  });
});

/**
 * GET /api/guests
 * Access: admin, manager, receptionist
 * Supports ?tier=&isVIP=&nationality=&search=&page=&limit=&sort=
 */
exports.getAllGuests = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { tier, isVIP, nationality, search, sort } = req.query;

  const filter = {};
  if (tier)                  filter.tier        = tier;
  if (isVIP !== undefined)   filter.isVIP       = isVIP === 'true';
  if (nationality)           filter.nationality  = { $regex: nationality, $options: 'i' };
  if (search) Object.assign(filter, buildNameFilter(search));

  const sortMap = {
    newest:       { createdAt: -1 },
    oldest:       { createdAt:  1 },
    name:         { lastName: 1, firstName: 1 },
    mostStays:    { totalStays: -1 },
    highestSpend: { lifetimeSpend: -1 },
  };
  const sortOrder = sortMap[sort] || sortMap.newest;

  const [guests, totalCount] = await Promise.all([
    Guest.find(filter).sort(sortOrder).skip(skip).limit(limit),
    Guest.countDocuments(filter),
  ]);

  // Batch-fetch active rooms so the registry table can show the "Room" column
  const guestIds = guests.map(g => g._id);
  let roomMap = {};
  try {
    const Reservation = getReservation();
    const activeRes = await Reservation.find(
      { guest: { $in: guestIds }, status: 'checked-in' },
      'guest room bookingId checkInDate checkOutDate'
    ).populate('room', 'roomNumber floor type').lean();

    activeRes.forEach(r => {
      roomMap[String(r.guest)] = {
        roomNumber:   r.room?.roomNumber  || null,
        floor:        r.room?.floor       || null,
        type:         r.room?.type        || null,
        bookingId:    r.bookingId,
        checkInDate:  r.checkInDate,
        checkOutDate: r.checkOutDate,
      };
    });
  } catch (_) {}

  sendSuccess(
    res,
    200,
    'Guests retrieved.',
    { guests: guests.map(g => buildGuestPayload(g, { currentRoom: roomMap[String(g._id)] || null })) },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/guests/:id
 * Also returns the guest's current active reservation + room number for the
 * "Room" column in the FE guest registry.
 * Access: admin, manager, receptionist
 */
exports.getGuestById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Guest ID');

  const guest = await Guest.findById(req.params.id);
  if (!guest) return next(new AppError('Guest not found.', 404));

  // Resolve current room from active reservation (lazy-load to avoid circular dep)
  let currentRoom = null;
  try {
    const Reservation = mongoose.model('Reservation');
    const active = await Reservation.findOne({
      guest:  guest._id,
      status: 'checked-in',
    })
      .populate('room', 'roomNumber floor type')
      .select('room bookingId checkInDate checkOutDate')
      .lean();

    if (active) {
      currentRoom = {
        roomNumber:   active.room?.roomNumber || null,
        floor:        active.room?.floor      || null,
        type:         active.room?.type       || null,
        bookingId:    active.bookingId,
        checkInDate:  active.checkInDate,
        checkOutDate: active.checkOutDate,
      };
    }
  } catch (_) {
    // Reservation model may not be registered in test environments
  }

  sendSuccess(res, 200, 'Guest retrieved.', {
    guest: buildGuestPayload(guest, { currentRoom }),
  });
});

/**
 * PATCH /api/guests/:id
 * Access: admin, manager, receptionist
 */
exports.updateGuest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Guest ID');

  const allowedFields = [
    'firstName', 'lastName', 'phone', 'nationality',
    'idType', 'idNumber', 'address', 'preferences',
    'isVIP', 'tier', 'lifetimeSpend',
  ];

  const updateFields = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updateFields[field] = req.body[field];
  });

  // Email changes require a duplicate check
  if (req.body.email !== undefined) {
    const conflict = await Guest.findOne({
      email: req.body.email.toLowerCase(),
      _id: { $ne: req.params.id },
    });
    if (conflict) {
      return next(new AppError('Another guest profile already uses this email.', 400));
    }
    updateFields.email = req.body.email;
  }

  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const guest = await Guest.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  );
  if (!guest) return next(new AppError('Guest not found.', 404));

  sendSuccess(res, 200, 'Guest profile updated successfully.', {
    guest: buildGuestPayload(guest),
  });
});

/**
 * DELETE /api/guests/:id
 * Access: admin, manager
 */
exports.deleteGuest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Guest ID');

  const guest = await Guest.findByIdAndDelete(req.params.id);
  if (!guest) return next(new AppError('Guest not found.', 404));

  sendSuccess(res, 200, `Guest profile for "${guest.firstName} ${guest.lastName}" has been deleted.`);
});

/**
 * GET /api/guests/search
 * Dedicated full-text search endpoint.
 * Access: admin, manager, receptionist
 * Supports ?q=&page=&limit=
 */
exports.searchGuests = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  if (!q || q.trim() === '') {
    return next(new AppError('Search query "q" is required.', 400));
  }

  const { page, limit, skip } = getPagination(req.query);

  const base   = buildNameFilter(q);
  const idRe   = { $regex: escapeRegex(q), $options: 'i' };
  const filter = { $or: [...base.$or, { idNumber: idRe }] };

  const [guests, totalCount] = await Promise.all([
    Guest.find(filter).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit),
    Guest.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    `Search results for "${q}".`,
    { guests: guests.map(g => buildGuestPayload(g)) },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * POST /api/guests/:id/recalc
 * Manually recalculate totalStays, lifetimeSpend, and tier for a single guest.
 * Useful after data corrections or bulk imports.
 * Access: admin, manager, receptionist
 */
exports.recalcGuestStats = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Guest ID');

  const guest = await Guest.recalcStats(req.params.id);
  if (!guest) return next(new AppError('Guest not found.', 404));

  sendSuccess(res, 200, `Stats recalculated for ${guest.firstName} ${guest.lastName}.`, {
    guest: buildGuestPayload(guest),
  });
});

/**
 * POST /api/guests/recalc-all
 * Recalculate stats for every guest. Admin / manager only.
 * Returns a summary of how many guests were updated and tier distribution.
 */
exports.recalcAllGuests = catchAsync(async (req, res) => {
  const guests = await Guest.find({}, '_id').lean();

  let updated = 0;
  const tierCounts = { none: 0, argent: 0, or: 0, etoile: 0 };

  // Process in small batches to avoid overwhelming MongoDB
  const BATCH = 20;
  for (let i = 0; i < guests.length; i += BATCH) {
    const batch = guests.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(g => Guest.recalcStats(g._id).catch(() => null)));
    results.forEach(g => {
      if (g) { updated++; tierCounts[g.tier] = (tierCounts[g.tier] || 0) + 1; }
    });
  }

  sendSuccess(res, 200, `Recalculated stats for ${updated} guests.`, {
    updated,
    tierDistribution: tierCounts,
  });
});
