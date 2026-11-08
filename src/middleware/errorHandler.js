const { error } = require('../utils/apiResponse');

const notFoundHandler = (req, res) => {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
};

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.url}:`, err);
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return error(res, 'Malformed JSON in request body', 400, 'INVALID_JSON');
  }

  if (err.code === '23505') {
    let message = 'A record with this identifier already exists.';
    if (err.detail && err.detail.includes('email')) {
      message = 'An account with this email address already exists.';
    } else if (err.constraint === 'unique_registration') {
      message = 'You are already registered for this event.';
    }
    return error(res, message, 409, 'DUPLICATE_RESOURCE');
  }

  if (err.code === '23503') {
    return error(res, 'Referenced record was not found.', 400, 'FOREIGN_KEY_VIOLATION');
  }

  if (err.code === '22P02') {
    return error(res, 'Invalid ID format provided.', 400, 'INVALID_ID_FORMAT');
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === '28P01' || err.code === 'ETIMEDOUT') {
    return error(
      res,
      'Database connection failed. Please ensure DATABASE_URL is properly configured with valid credentials.',
      503,
      'DATABASE_UNAVAILABLE'
    );
  }

  if (err.statusCode) {
    return error(res, err.message, err.statusCode, err.code || null);
  }

  return error(
    res,
    'An unexpected internal server error occurred. Please try again later.',
    500,
    'INTERNAL_SERVER_ERROR'
  );
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
