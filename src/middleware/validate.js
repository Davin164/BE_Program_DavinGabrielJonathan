const { validationResult } = require('express-validator');

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
