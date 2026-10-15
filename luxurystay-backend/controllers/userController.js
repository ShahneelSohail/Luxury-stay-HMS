const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');
const { getPermissions } = require('../utils/rolePermissions');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildUserPayload = (user) => ({
  id:          user._id,
  name:        user.name,
  email:       user.email,
  role:        user.role,
  phone:       user.phone || null,
  isActive:    user.isActive,
  lastLogin:   user.lastLogin,
  createdAt:   user.createdAt,
  updatedAt:   user.updatedAt,
  permissions: getPermissions(user.role),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/users
 * Admin only — creates staff accounts with explicit role assignment.
 * Guests self-register via POST /api/auth/register.
 */
exports.createUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 400));
  }

  const user = await User.create({ name, email, password, role, phone });

  sendSuccess(res, 201, `Staff account created for ${user.name}.`, {
    user: buildUserPayload(user),
  });
});

/**
 * GET /api/users
 * Admin only — paginated list with filters for role, status, and search.
 * Supports ?role=&isActive=&search=&page=&limit=&sort=
 */
exports.getAllUsers = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { role, isActive, search, sort } = req.query;

  const filter = {};
  if (role)                     filter.role     = role;
  if (isActive !== undefined)   filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const sortMap = {
    newest:  { createdAt: -1 },
    oldest:  { createdAt:  1 },
    name:    { name:       1 },
  };
  const sortOrder = sortMap[sort] || sortMap.newest;

  const [users, totalCount] = await Promise.all([
    User.find(filter).sort(sortOrder).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    'Users retrieved.',
    { users: users.map(buildUserPayload) },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/users/:id
 * Admin only.
 */
exports.getUserById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'User ID');

  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));

  sendSuccess(res, 200, 'User retrieved.', { user: buildUserPayload(user) });
});

/**
 * PATCH /api/users/:id
 * Admin only — can update name, email, role, phone, isActive.
 * Password updates are intentionally excluded; use changePassword flow.
 */
exports.updateUser = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'User ID');

  const { name, email, role, phone, isActive } = req.body;

  const updateFields = {};
  if (name     !== undefined) updateFields.name     = name;
  if (email    !== undefined) updateFields.email    = email;
  if (role     !== undefined) updateFields.role     = role;
  if (phone    !== undefined) updateFields.phone    = phone;
  if (isActive !== undefined) updateFields.isActive = isActive;

  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  );
  if (!user) return next(new AppError('User not found.', 404));

  sendSuccess(res, 200, 'User updated successfully.', { user: buildUserPayload(user) });
});

/**
 * DELETE /api/users/:id
 * Admin only — soft-delete by setting isActive=false.
 * Admins cannot deactivate their own account.
 */
exports.deactivateUser = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'User ID');

  if (req.params.id === req.user.id.toString()) {
    return next(new AppError('You cannot deactivate your own account.', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!user) return next(new AppError('User not found.', 404));

  sendSuccess(res, 200, `Account for "${user.name}" has been deactivated.`, {
    user: buildUserPayload(user),
  });
});
