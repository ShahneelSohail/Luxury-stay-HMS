const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPermissions } = require('../utils/rolePermissions');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Shapes the user object returned to the client.
 * Permissions are included so the FE can immediately determine
 * which routes to render and which UI elements to show.
 */
const buildUserPayload = (user) => ({
  id:          user._id,
  name:        user.name,
  email:       user.email,
  role:        user.role,
  phone:       user.phone || null,
  isActive:    user.isActive,
  lastLogin:   user.lastLogin,
  createdAt:   user.createdAt,
  permissions: getPermissions(user.role),
});

const sendTokenResponse = (user, statusCode, message, res) => {
  const token = user.generateToken();
  sendSuccess(res, statusCode, message, {
    token,
    user: buildUserPayload(user),
  });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Public — self-registration is always guest role.
 * Staff accounts are created by admin via POST /api/users.
 */
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'guest',
  });

  sendTokenResponse(user, 201, 'Registration successful. Welcome to LuxuryStay!', res);
});

/**
 * POST /api/auth/login
 * Public — returns token + full user payload with permissions for FE routing.
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(
      new AppError('Your account has been deactivated. Please contact the hotel administration.', 401)
    );
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, 'Login successful.', res);
});

/**
 * POST /api/auth/logout
 * Protected — JWT is stateless, so the client is responsible for discarding
 * the token. This endpoint exists for a clean API contract and future
 * token-blacklist integration.
 */
exports.logout = catchAsync(async (req, res) => {
  sendSuccess(res, 200, 'Logged out successfully.');
});

/**
 * GET /api/auth/me
 * Protected — returns full profile + permissions for session restoration on FE reload.
 */
exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  sendSuccess(res, 200, 'Profile retrieved.', { user: buildUserPayload(user) });
});

/**
 * PATCH /api/auth/me
 * Protected — users can update their own name and phone only.
 * Role, email, and password changes go through dedicated endpoints.
 */
exports.updateMe = catchAsync(async (req, res) => {
  const { name, phone } = req.body;

  const updateFields = {};
  if (name  !== undefined) updateFields.name  = name;
  if (phone !== undefined) updateFields.phone = phone;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateFields,
    { new: true, runValidators: true }
  );

  sendSuccess(res, 200, 'Profile updated successfully.', { user: buildUserPayload(user) });
});

/**
 * PATCH /api/auth/change-password
 * Protected — issues a fresh token on success so the FE session stays active.
 */
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 400));
  }

  if (currentPassword === newPassword) {
    return next(new AppError('New password must be different from the current password.', 400));
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, 'Password changed successfully.', res);
});
