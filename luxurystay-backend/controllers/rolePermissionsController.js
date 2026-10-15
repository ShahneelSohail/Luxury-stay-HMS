const RolePageAccess = require('../models/RolePageAccess');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { AppError } = require('../middleware/errorHandler');

const ROLES = ['admin', 'manager', 'receptionist', 'housekeeping', 'service'];

// Defaults that seed the DB on first GET if nothing is stored yet
const DEFAULTS = {
  admin:        { Dashboard: true,  Reservations: true,  'Check-in / out': true,  Rooms: true,  Housekeeping: true,  'Service Requests': true,  Billing: true,  Guests: true,  Feedback: true,  Inbox: true,  Analytics: true,  Suites: true,  'Staff & Roles': true,  Settings: true },
  manager:      { Dashboard: true,  Reservations: true,  'Check-in / out': true,  Rooms: true,  Housekeeping: true,  'Service Requests': true,  Billing: true,  Guests: true,  Feedback: true,  Inbox: true,  Analytics: true,  Suites: false, 'Staff & Roles': false, Settings: false },
  receptionist: { Dashboard: true,  Reservations: true,  'Check-in / out': true,  Rooms: true,  Housekeeping: false, 'Service Requests': false, Billing: true,  Guests: true,  Feedback: false, Inbox: true,  Analytics: false, Suites: false, 'Staff & Roles': false, Settings: false },
  housekeeping: { Dashboard: true,  Reservations: false, 'Check-in / out': false, Rooms: true,  Housekeeping: true,  'Service Requests': true,  Billing: false, Guests: false, Feedback: false, Inbox: false, Analytics: false, Suites: false, 'Staff & Roles': false, Settings: false },
  service:      { Dashboard: true,  Reservations: false, 'Check-in / out': false, Rooms: true,  Housekeeping: false, 'Service Requests': true,  Billing: false, Guests: false, Feedback: false, Inbox: false, Analytics: false, Suites: false, 'Staff & Roles': false, Settings: false },
};

/**
 * GET /api/role-permissions
 * Returns page access map for all roles. Seeds defaults if not yet stored.
 */
exports.getAllRolePermissions = catchAsync(async (req, res) => {
  const stored = await RolePageAccess.find({});

  // Seed any missing roles
  const storedRoles = stored.map(r => r.role);
  const missing = ROLES.filter(r => !storedRoles.includes(r));
  if (missing.length) {
    await RolePageAccess.insertMany(
      missing.map(role => ({ role, pages: DEFAULTS[role] }))
    );
  }

  const all = await RolePageAccess.find({});
  const result = {};
  for (const doc of all) {
    // Merge defaults so any new pages added to DEFAULTS appear automatically
    result[doc.role] = { ...DEFAULTS[doc.role], ...Object.fromEntries(doc.pages) };
  }

  sendSuccess(res, 200, 'Role permissions retrieved.', { permissions: result });
});

/**
 * PUT /api/role-permissions/:role
 * Replaces the page access map for a single role.
 * Body: { pages: { [pageLabel]: boolean } }
 */
exports.updateRolePermissions = catchAsync(async (req, res, next) => {
  const { role } = req.params;
  if (!ROLES.includes(role)) {
    return next(new AppError(`Invalid role: ${role}`, 400));
  }

  const { pages } = req.body;
  if (!pages || typeof pages !== 'object') {
    return next(new AppError('Body must contain a "pages" object.', 400));
  }

  const doc = await RolePageAccess.findOneAndUpdate(
    { role },
    { pages },
    { new: true, upsert: true, runValidators: true }
  );

  sendSuccess(res, 200, `Permissions updated for ${role}.`, {
    role: doc.role,
    pages: Object.fromEntries(doc.pages),
  });
});
