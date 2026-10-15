// ─── Custom Error Class ───────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Error Transformers ───────────────────────────────────────────────────────

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: "${err.value}" is not a valid ID.`, 400);

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(
    `Duplicate value "${value}" for field "${field}". Please use a different value.`,
    400
  );
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation error: ${messages.join('. ')}`, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpired = () =>
  new AppError('Your session has expired. Please log in again.', 401);

// ─── Response Formatters ──────────────────────────────────────────────────────

const sendDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    // Don't leak internal error details in production
    console.error('[ERROR] Non-operational error:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
};

// ─── Global Error Handler Middleware ─────────────────────────────────────────

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendDev(err, res);
  } else {
    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastError(error);
    if (err.code === 11000) error = handleDuplicateKey(error);
    if (err.name === 'ValidationError') error = handleValidationError(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpired();

    sendProd(error, res);
  }
};

module.exports = errorHandler;
module.exports.AppError = AppError;
