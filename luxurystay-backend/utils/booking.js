const Room        = require('../models/Room');
const Reservation = require('../models/Reservation');
const Suite       = require('../models/Suite');

const TYPE_LABEL_MAP = {
  'Deluxe Twin':   'deluxe_twin',
  'Deluxe King':   'deluxe_king',
  'Junior Suite':  'junior_suite',
  'Premier Suite': 'premier_suite',
  'Penthouse':     'penthouse',
};

const TYPE_DISPLAY = {
  deluxe_twin:   'Deluxe Twin',
  deluxe_king:   'Deluxe King',
  junior_suite:  'Junior Suite',
  premier_suite: 'Premier Suite',
  penthouse:     'Penthouse',
};

const DEPOSIT_RATE = 0.3;
const MS_PER_DAY   = 1000 * 60 * 60 * 24;

const countNights = (checkInDate, checkOutDate) =>
  Math.ceil((checkOutDate - checkInDate) / MS_PER_DAY);

const findBlockedRoomIds = (checkInDate, checkOutDate) =>
  Reservation.find({
    status:       { $in: ['pending', 'confirmed', 'checked-in'] },
    checkInDate:  { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  }).distinct('room');

async function findAvailableRoomTypes({ checkInDate, checkOutDate, adults }) {
  const nights     = countNights(checkInDate, checkOutDate);
  const blockedIds = await findBlockedRoomIds(checkInDate, checkOutDate);

  const filter = { status: { $in: ['available', 'reserved'] }, isActive: true };
  if (adults) filter.maxGuests = { $gte: Number(adults) };
  if (blockedIds.length) filter._id = { $nin: blockedIds };

  const rooms = await Room.find(filter).sort({ 'rates.standard': 1 });

  const byType = {};
  rooms.forEach(r => {
    if (!byType[r.type]) {
      byType[r.type] = {
        type:      r.type,
        typeLabel: TYPE_DISPLAY[r.type] || r.type,
        rate:      r.rates.standard,
        total:     r.rates.standard * nights,
        maxGuests: r.maxGuests,
        count:     0,
        roomId:    r._id,
      };
    }
    byType[r.type].count++;
  });

  const suites = await Suite.find({ slug: { $in: Object.keys(byType) }, isActive: true }).lean();
  suites.forEach(s => {
    if (byType[s.slug]) {
      byType[s.slug].suiteId     = s._id;
      byType[s.slug].description = s.description || null;
      byType[s.slug].sqm         = s.sqm         || null;
      byType[s.slug].gradient    = s.gradient     || null;
      byType[s.slug].amenities   = s.amenities    || [];
      byType[s.slug].images      = s.images       || [];
      byType[s.slug].sortOrder   = s.sortOrder    ?? 99;
    }
  });

  const types = Object.values(byType).sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

  return { nights, roomCount: rooms.length, types };
}

module.exports = {
  TYPE_LABEL_MAP,
  TYPE_DISPLAY,
  DEPOSIT_RATE,
  countNights,
  findBlockedRoomIds,
  findAvailableRoomTypes,
};
