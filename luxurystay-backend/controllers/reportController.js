const mongoose           = require('mongoose');
const Reservation        = require('../models/Reservation');
const Room               = require('../models/Room');
const Guest              = require('../models/Guest');
const Invoice            = require('../models/Invoice');
const HousekeepingTask   = require('../models/HousekeepingTask');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const catchAsync         = require('../utils/catchAsync');
const { sendSuccess }    = require('../utils/apiResponse');
const { AppError }       = require('../middleware/errorHandler');

// ─── Shared helpers ───────────────────────────────────────────────────────────

const parseDateRange = (from, to, defaultDays = 30) => {
  const end   = to   ? new Date(to)   : new Date();
  const start = from ? new Date(from) : new Date(end - defaultDays * 24 * 60 * 60 * 1000);
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

// Convert period shorthand (week/month/year) or explicit from/to into a date range
const periodToRange = (period, from, to) => {
  if (from || to) return parseDateRange(from, to);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if      (period === 'week') start.setDate(start.getDate() - 6);
  else if (period === 'year') { start.setFullYear(start.getFullYear() - 1); start.setDate(start.getDate() + 1); }
  else                         start.setDate(start.getDate() - 29); // month default
  return { start, end };
};

const daysBetween = (a, b) =>
  Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));

// Fill gaps in a daily revenue series so every date in [start, end] has an entry
function fillDailySeries(rawData, start, end) {
  const map = {};
  rawData.forEach(d => { map[d._id] = +d.revenue.toFixed(2); });
  const series = [];
  const cur = new Date(start);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    series.push({ date: key, revenue: map[key] || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return series;
}

// Fill gaps in a monthly revenue series (YYYY-MM buckets)
function fillMonthlySeries(rawData, start, end) {
  const map = {};
  rawData.forEach(d => { map[d._id] = +d.revenue.toFixed(2); });
  const series = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const endYM = end.getFullYear() * 12 + end.getMonth();
  while (cur.getFullYear() * 12 + cur.getMonth() <= endYM) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    series.push({ date: key, revenue: map[key] || 0 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return series;
}

// Build occupancy time series from an in-memory reservations array (avoids N queries)
function buildOccupancySeries(reservations, totalRooms, start, end, period) {
  if (!totalRooms) return [];
  if (period === 'year') {
    // Monthly averages — iterate daily, bucket by month
    const monthMap = {};
    const cur = new Date(start);
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      const dayStart = new Date(cur);
      const dayEnd   = new Date(cur); dayEnd.setDate(dayEnd.getDate() + 1);
      const occupied = reservations.filter(r => r.checkInDate < dayEnd && r.checkOutDate > dayStart).length;
      if (!monthMap[key]) monthMap[key] = { total: 0, days: 0 };
      monthMap[key].total += occupied;
      monthMap[key].days  += 1;
      cur.setDate(cur.getDate() + 1);
    }
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { total, days }]) => ({
        date,
        occupancyPct: +((total / days / totalRooms) * 100).toFixed(1),
      }));
  }
  // Daily
  const series = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dayStart = new Date(cur);
    const dayEnd   = new Date(cur); dayEnd.setDate(dayEnd.getDate() + 1);
    const occupied = reservations.filter(r => r.checkInDate < dayEnd && r.checkOutDate > dayStart).length;
    series.push({ date: cur.toISOString().slice(0, 10), occupancyPct: +((occupied / totalRooms) * 100).toFixed(1) });
    cur.setDate(cur.getDate() + 1);
  }
  return series;
}

const SOURCE_LABELS = {
  online_agent: 'Guest Portal',
  walk_in:      'Walk-in',
  phone:        'Phone',
  ota:          'OTA',
  corporate:    'Corporate',
  agent:        'Travel Agent',
  direct:       'Direct',
};

const CATEGORY_LABELS = {
  room:      'Rooms',
  food:      'Dining',
  spa:       'Spa',
  bar:       'Bar & cellar',
  laundry:   'Laundry',
  transport: 'Transport',
  other:     'Other',
};

// ─── 1. Dashboard Metrics ─────────────────────────────────────────────────────

/**
 * GET /api/reports/dashboard
 * KPI tiles: occupancy %, ADR, RevPAR, YTD revenue, in-house count,
 * today arrivals/departures, 14-day daily revenue series.
 */
exports.getDashboardMetrics = catchAsync(async (req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const ytdStart   = new Date(new Date().getFullYear(), 0, 1); ytdStart.setHours(0, 0, 0, 0);

  const [
    totalRooms, occupiedRooms,
    inHouseReservations,
    arrivalsToday, departuresToday,
    revenueData,
    dailyRevenue,
    ytdRevenue,
  ] = await Promise.all([
    Room.countDocuments({ isActive: true }),
    Room.countDocuments({ status: 'occupied', isActive: true }),

    Reservation.countDocuments({ status: 'checked-in' }),

    Reservation.countDocuments({
      checkInDate: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
    }),
    Reservation.countDocuments({
      checkOutDate: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['checked-in', 'checked-out'] },
    }),

    // ADR = total room revenue / total occupied nights (all time)
    Invoice.aggregate([
      { $match: { paymentStatus: { $in: ['open', 'partial', 'paid'] } } },
      { $unwind: '$lineItems' },
      { $match: { 'lineItems.category': 'room' } },
      { $group: { _id: null, totalRoomRevenue: { $sum: '$lineItems.total' }, totalNights: { $sum: '$lineItems.quantity' } } },
    ]),

    // Daily revenue — last 14 days for bar chart
    Invoice.aggregate([
      {
        $match: {
          paymentStatus: { $in: ['open', 'partial', 'paid'] },
          createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),

    // YTD total revenue
    Invoice.aggregate([
      { $match: { paymentStatus: { $in: ['open', 'partial', 'paid'] }, createdAt: { $gte: ytdStart } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  const occupancyPct = totalRooms > 0 ? +((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;
  const adr          = revenueData[0]?.totalNights > 0
    ? +(revenueData[0].totalRoomRevenue / revenueData[0].totalNights).toFixed(2)
    : 0;
  const revpar       = +((adr * occupancyPct) / 100).toFixed(2);
  const revenueYTD   = +(ytdRevenue[0]?.total || 0).toFixed(2);

  sendSuccess(res, 200, 'Dashboard metrics retrieved.', {
    metrics: {
      occupancyPct,
      adr,
      revpar,
      revenueYTD,
      totalRooms,
      occupiedRooms,
      inHouseGuests:  inHouseReservations,
      arrivalsToday,
      departuresToday,
    },
    dailyRevenue14Days: dailyRevenue.map(d => ({ date: d._id, revenue: +d.revenue.toFixed(2) })),
  });
});

// ─── 2. Occupancy Report ──────────────────────────────────────────────────────

/**
 * GET /api/reports/occupancy?period=week|month|year  (or ?from=&to=)
 * Returns a time series suitable for the FE line chart + breakdown by room type.
 */
exports.getOccupancyReport = catchAsync(async (req, res, next) => {
  const { period = 'month', from, to } = req.query;
  const { start, end } = periodToRange(period, from, to);
  const nights         = daysBetween(start, end);

  if (start >= end) return next(new AppError('Start date must be before end date.', 400));

  const [totalRooms, byType, byFloor, byStatus, reservations] = await Promise.all([
    Room.countDocuments({ isActive: true }),

    Room.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Room.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$floor', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Room.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Fetch raw reservations for JS-side series computation
    Reservation.find({
      status:       { $in: ['checked-in', 'checked-out'] },
      checkInDate:  { $lt: end },
      checkOutDate: { $gt: start },
    }, 'checkInDate checkOutDate').lean(),
  ]);

  // Build time series in JS (one query, no N+1)
  const series = buildOccupancySeries(reservations, totalRooms, start, end, period);

  const availableRoomNights = totalRooms * nights;
  const occupiedNightsTotal = reservations.reduce((sum, r) => {
    const overlapStart = Math.max(r.checkInDate.getTime(), start.getTime());
    const overlapEnd   = Math.min(r.checkOutDate.getTime(), end.getTime());
    return sum + Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
  }, 0);
  const overallOccupancy = availableRoomNights > 0
    ? +((occupiedNightsTotal / availableRoomNights) * 100).toFixed(1)
    : 0;

  sendSuccess(res, 200, 'Occupancy report retrieved.', {
    period:           { from: start, to: end, nights },
    overallOccupancy,
    series,
    totalRooms,
    availableRoomNights: +availableRoomNights.toFixed(0),
    occupiedRoomNights:  +occupiedNightsTotal.toFixed(0),
    currentStatusBreakdown: byStatus.reduce((a, s) => { a[s._id] = s.count; return a; }, {}),
    byRoomType: byType.map(t => ({ type: t._id, totalRooms: t.total })),
    byFloor:    byFloor.map(f => ({ floor: f._id, totalRooms: f.total })),
  });
});

// ─── 3. Revenue Report ────────────────────────────────────────────────────────

/**
 * GET /api/reports/revenue?period=week|month|year  (or ?from=&to=)
 * Returns a time series for the bar chart + category breakdown.
 */
exports.getRevenueReport = catchAsync(async (req, res, next) => {
  const { period = 'month', from, to } = req.query;
  const { start, end } = periodToRange(period, from, to);
  if (start >= end) return next(new AppError('Start date must be before end date.', 400));

  const groupFormat = period === 'year' ? '%Y-%m' : '%Y-%m-%d';

  const [revenueSeries, categoryRevenue, paymentSummary, bookingSourceRevenue] = await Promise.all([
    // Time series for bar chart
    Invoice.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: { $in: ['open', 'partial', 'paid'] } } },
      { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),

    // Revenue by line item category
    Invoice.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: { $in: ['open', 'partial', 'paid'] } } },
      { $unwind: '$lineItems' },
      { $group: { _id: '$lineItems.category', total: { $sum: '$lineItems.total' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),

    // Payment status summary
    Invoice.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id:            '$paymentStatus',
        total:          { $sum: '$totalAmount' },
        count:          { $sum: 1 },
        amountCollected:{ $sum: '$amountPaid' },
      }},
    ]),

    // Revenue by booking source
    Invoice.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: { $in: ['open', 'partial', 'paid'] } } },
      { $lookup: { from: 'reservations', localField: 'reservation', foreignField: '_id', as: 'res' } },
      { $unwind: '$res' },
      { $group: { _id: '$res.source', revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  const series = period === 'year'
    ? fillMonthlySeries(revenueSeries, start, end)
    : fillDailySeries(revenueSeries, start, end);

  const totalRevenue   = categoryRevenue.reduce((s, c) => s + c.total, 0);
  const byCategory     = categoryRevenue.map(c => ({
    category: c._id,
    label:    CATEGORY_LABELS[c._id] || c._id,
    amount:   +c.total.toFixed(2),
    pct:      totalRevenue > 0 ? +((c.total / totalRevenue) * 100).toFixed(1) : 0,
  }));

  sendSuccess(res, 200, 'Revenue report retrieved.', {
    period:       { from: start, to: end },
    totalRevenue: +totalRevenue.toFixed(2),
    series,
    byCategory,
    byPaymentStatus: paymentSummary.reduce((a, p) => {
      a[p._id] = { total: +p.total.toFixed(2), count: p.count, collected: +p.amountCollected.toFixed(2) };
      return a;
    }, {}),
    byBookingSource: bookingSourceRevenue.map(s => ({
      source:  s._id,
      label:   SOURCE_LABELS[s._id] || s._id,
      revenue: +s.revenue.toFixed(2),
      count:   s.count,
      pct:     totalRevenue > 0 ? +((s.revenue / totalRevenue) * 100).toFixed(1) : 0,
    })),
  });
});

// ─── 4. Guest Report ──────────────────────────────────────────────────────────

/**
 * GET /api/reports/guests?from=&to=
 * New vs returning guests, nationality breakdown, booking sources.
 */
exports.getGuestReport = catchAsync(async (req, res, next) => {
  const { start, end } = parseDateRange(req.query.from, req.query.to);
  if (start >= end) return next(new AppError('Start date must be before end date.', 400));

  const [guestStats, nationalityBreakdown, vipCount, newGuestCount, bookingSource] = await Promise.all([
    Guest.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id:       null,
        total:     { $sum: 1 },
        returning: { $sum: { $cond: [{ $gt: ['$totalStays', 1] }, 1, 0] } },
        avgStays:  { $avg: '$totalStays' },
      }},
    ]),

    Guest.aggregate([
      { $match: { nationality: { $ne: null } } },
      { $group: { _id: '$nationality', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    Guest.countDocuments({ isVIP: true }),
    Guest.countDocuments({ createdAt: { $gte: start, $lte: end }, totalStays: { $lte: 1 } }),

    Reservation.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const total      = guestStats[0]?.total     || 0;
  const returning  = guestStats[0]?.returning || 0;
  const repeatRate = total > 0 ? +((returning / total) * 100).toFixed(1) : 0;
  const totalGuests = await Guest.countDocuments();

  const nationalityTotal = nationalityBreakdown.reduce((s, n) => s + n.count, 0);
  const nationalities = nationalityBreakdown.map(n => ({
    nationality: n._id,
    count:       n.count,
    pct:         nationalityTotal > 0 ? +((n.count / nationalityTotal) * 100).toFixed(1) : 0,
  }));

  const sourceTotal = bookingSource.reduce((s, b) => s + b.count, 0);
  const sources = bookingSource.map(s => ({
    source: s._id,
    label:  SOURCE_LABELS[s._id] || s._id,
    count:  s.count,
    pct:    sourceTotal > 0 ? +((s.count / sourceTotal) * 100).toFixed(1) : 0,
  }));

  sendSuccess(res, 200, 'Guest report retrieved.', {
    period: { from: start, to: end },
    summary: {
      totalGuestsAllTime: totalGuests,
      newInPeriod:        newGuestCount,
      returningInPeriod:  returning,
      repeatRatePct:      repeatRate,
      vipGuests:          vipCount,
      avgStaysPerGuest:   guestStats[0] ? +guestStats[0].avgStays.toFixed(1) : 0,
    },
    nationalities,
    sources,
  });
});

// ─── 5. Room Performance Report ───────────────────────────────────────────────

/**
 * GET /api/reports/room-performance?from=&to=
 * Revenue + occupancy per room type.
 */
exports.getRoomPerformanceReport = catchAsync(async (req, res, next) => {
  const { start, end } = parseDateRange(req.query.from, req.query.to);
  if (start >= end) return next(new AppError('Start date must be before end date.', 400));

  const nights = daysBetween(start, end);

  const [roomCounts, revenueByType, staysByType] = await Promise.all([
    Room.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 }, avgStandardRate: { $avg: '$rates.standard' } } },
    ]),

    Invoice.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: { $in: ['open', 'partial', 'paid'] } } },
      { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'roomData' } },
      { $unwind: '$roomData' },
      { $group: { _id: '$roomData.type', totalRevenue: { $sum: '$totalAmount' }, invoiceCount: { $sum: 1 } } },
    ]),

    Reservation.aggregate([
      { $match: { status: { $in: ['checked-in', 'checked-out'] }, checkInDate: { $lt: end }, checkOutDate: { $gt: start } } },
      { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'roomData' } },
      { $unwind: '$roomData' },
      { $group: {
        _id:   '$roomData.type',
        stays: { $sum: 1 },
        totalNights: {
          $sum: {
            $divide: [
              { $subtract: [{ $min: ['$checkOutDate', end] }, { $max: ['$checkInDate', start] }] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      }},
    ]),
  ]);

  const revByType  = revenueByType.reduce((a, r) => { a[r._id] = r; return a; }, {});
  const stayByType = staysByType.reduce((a, s) => { a[s._id] = s; return a; }, {});

  const performance = roomCounts.map(rc => {
    const rev       = revByType[rc._id]  || {};
    const stay      = stayByType[rc._id] || {};
    const availNights = rc.count * nights;
    const occNights   = +(stay.totalNights || 0).toFixed(0);
    const occPct      = availNights > 0 ? +((occNights / availNights) * 100).toFixed(1) : 0;
    const adr         = occNights > 0 ? +((rev.totalRevenue || 0) / occNights).toFixed(2) : 0;
    return {
      type:            rc._id,
      totalRooms:      rc.count,
      avgStandardRate: +rc.avgStandardRate.toFixed(2),
      stays:           stay.stays       || 0,
      occupiedNights:  occNights,
      occupancyPct:    occPct,
      totalRevenue:    +(rev.totalRevenue || 0).toFixed(2),
      adr,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  sendSuccess(res, 200, 'Room performance report retrieved.', {
    period: { from: start, to: end, nights },
    performance,
  });
});

// ─── 6. Housekeeping Report ───────────────────────────────────────────────────

/**
 * GET /api/reports/housekeeping?from=&to=
 */
exports.getHousekeepingReport = catchAsync(async (req, res, next) => {
  const { start, end } = parseDateRange(req.query.from, req.query.to, 7);
  if (start >= end) return next(new AppError('Start date must be before end date.', 400));

  const [statusSummary, byType, byPriority, byStaff, avgDuration, issueCount] = await Promise.all([
    HousekeepingTask.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    HousekeepingTask.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$taskType', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { count: -1 } },
    ]),

    HousekeepingTask.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),

    HousekeepingTask.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staffData' } },
      { $unwind: { path: '$staffData', preserveNullAndEmpty: true } },
      { $project: { staffName: '$staffData.name', total: 1, completed: 1 } },
      { $sort: { completed: -1 } },
      { $limit: 10 },
    ]),

    HousekeepingTask.aggregate([
      { $match: { status: 'completed', completedAt: { $ne: null }, scheduledFor: { $ne: null }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, avgDurationMs: { $avg: { $subtract: ['$completedAt', '$scheduledFor'] } } } },
    ]),

    HousekeepingTask.countDocuments({ createdAt: { $gte: start, $lte: end }, reportedIssue: { $ne: null } }),
  ]);

  const statusMap = statusSummary.reduce((a, s) => { a[s._id] = s.count; return a; }, {});
  const avgMins   = avgDuration[0] ? +(avgDuration[0].avgDurationMs / (1000 * 60)).toFixed(1) : null;

  sendSuccess(res, 200, 'Housekeeping report retrieved.', {
    period: { from: start, to: end },
    summary: {
      queued:               statusMap.queued         || 0,
      inProgress:           statusMap['in-progress'] || 0,
      completed:            statusMap.completed      || 0,
      avgCompletionMinutes: avgMins,
      issuesReported:       issueCount,
    },
    byTaskType: byType.map(t => ({ taskType: t._id, total: t.count, completed: t.completed })),
    byPriority: byPriority.reduce((a, p) => { a[p._id] = p.count; return a; }, {}),
    byStaff:    byStaff.map(s => ({ staffId: s._id, staffName: s.staffName, total: s.total, completed: s.completed })),
  });
});

// ─── 7. Maintenance Report ────────────────────────────────────────────────────

/**
 * GET /api/reports/maintenance?from=&to=
 */
exports.getMaintenanceReport = catchAsync(async (req, res, next) => {
  const { start, end } = parseDateRange(req.query.from, req.query.to, 30);
  if (start >= end) return next(new AppError('Start date must be before end date.', 400));

  const [statusSummary, byCategory, byPriority, avgResolution, byStaff] = await Promise.all([
    MaintenanceRequest.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    MaintenanceRequest.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } } } },
      { $sort: { count: -1 } },
    ]),

    MaintenanceRequest.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),

    MaintenanceRequest.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $ne: null }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } }, count: { $sum: 1 } } },
    ]),

    MaintenanceRequest.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staffData' } },
      { $unwind: { path: '$staffData', preserveNullAndEmpty: true } },
      { $project: { staffName: '$staffData.name', total: 1, resolved: 1 } },
      { $sort: { resolved: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const statusMap = statusSummary.reduce((a, s) => { a[s._id] = s.count; return a; }, {});
  const avgHours  = avgResolution[0] ? +((avgResolution[0].avgMs / (1000 * 60 * 60)).toFixed(1)) : null;

  sendSuccess(res, 200, 'Maintenance report retrieved.', {
    period: { from: start, to: end },
    summary: {
      open:               statusMap.open           || 0,
      assigned:           statusMap.assigned       || 0,
      inProgress:         statusMap['in-progress'] || 0,
      resolved:           statusMap.resolved       || 0,
      avgResolutionHours: avgHours,
      resolvedCount:      avgResolution[0]?.count  || 0,
    },
    byCategory:   byCategory.map(c => ({ category: c._id, total: c.count, resolved: c.resolved })),
    byPriority:   byPriority.reduce((a, p) => { a[p._id] = p.count; return a; }, {}),
    byTechnician: byStaff.map(s => ({ staffId: s._id, staffName: s.staffName, total: s.total, resolved: s.resolved })),
  });
});
