const mongoose = require('mongoose');
const { AppError } = require('../middleware/errorHandler');

/**
 * Throws an AppError if id is not a valid MongoDB ObjectId.
 * Call this at the top of any controller that receives :id from params.
 */
const validateObjectId = (id, fieldName = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${fieldName}: "${id}" is not a valid resource identifier.`, 400);
  }
};

module.exports = { validateObjectId };
