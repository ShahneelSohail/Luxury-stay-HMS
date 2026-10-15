/**
 * Sends a uniform success response.
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Human-readable message
 * @param {object} data - Response payload
 * @param {object} meta - Pagination or extra metadata
 */
const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Sends a uniform error response.
 * Prefer AppError + global handler over calling this directly.
 */
const sendError = (res, statusCode, message, errors = []) => {
  const response = { success: false, message };
  if (errors.length) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError };
