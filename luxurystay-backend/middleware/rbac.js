const { AppError } = require('./errorHandler');

const VALID_ROLES = ['admin', 'manager', 'receptionist', 'housekeeping', 'service', 'guest'];

/**
 * Restrict access to one or more roles.
 * Usage: authorize('admin', 'manager') or authorize(['admin', 'manager'])
 */
const authorize = (...roles) => {
  const allowedRoles = roles.flat();

  // Validate roles at definition time to catch typos early
  const invalid = allowedRoles.filter((r) => !VALID_ROLES.includes(r));
  if (invalid.length) {
    throw new Error(`[RBAC] Unknown role(s) in authorize(): ${invalid.join(', ')}`);
  }

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
          403
        )
      );
    }

    next();
  };
};

module.exports = { authorize, VALID_ROLES };
