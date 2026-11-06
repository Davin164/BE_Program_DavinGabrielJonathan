/**
 * @file validate.js
 * @description Input validation runner middleware using express-validator.
 * Extracts validation results and returns a structured 400 error response if invalid.
 */

const { validationResult } = require('express-validator');

/**
 * Validation runner middleware.
 * Checks express-validator results on the current request.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const formattedErrors = errors.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value,
  }));

  return res.status(400).json({
    success: false,
    message: 'Validation failed. Please check the provided inputs.',
    code: 'VALIDATION_ERROR',
    errors: formattedErrors,
  });
};

module.exports = {
  validate,
};
