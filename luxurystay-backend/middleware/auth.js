const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const catchAsync = require('../utils/catchAsync');

const protect = catchAsync(async (req, res, next) => {
  // 1. Extract token from Authorization header
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  // 2. Verify token integrity and expiry
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3. Confirm the user still exists (lazy-loaded to avoid circular dep at startup)
  const User = require('../models/User');
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    return next(new AppError('The account associated with this token no longer exists.', 401));
  }

  // 4. Reject deactivated accounts
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 401));
  }

  // 5. Attach user to request for downstream use
  req.user = user;
  next();
});

module.exports = { protect };
