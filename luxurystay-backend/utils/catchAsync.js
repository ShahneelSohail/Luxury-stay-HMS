/**
 * Wraps an async Express controller to forward any thrown error
 * to the next() error handler, eliminating try/catch boilerplate.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
