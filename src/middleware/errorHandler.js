/**
 * @file errorHandler.js
 * @description Global error handler and 404 route not found middleware.
 * Ensures internal database details and stack traces are NEVER leaked to the client.
 */

const { error } = require('../utils/apiResponse');

/**
 * 404 Not Found handler for unmatched routes.
 */
const notFoundHandler = (req, res) => {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
};

/**
 * Global error handler middleware.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log full error details to internal server console for observability
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.url}:`, err);
  }

  // Handle express body parser JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return error(res, 'Malformed JSON in request body', 400, 'INVALID_JSON');
  }

  // PostgreSQL unique violation error (23505)
  if (err.code === '23505') {
    let message = 'A record with this identifier already exists.';
    if (err.detail && err.detail.includes('email')) {
      message = 'An account with this email address already exists.';
    } else if (err.constraint === 'unique_registration') {
      message = 'You are already registered for this event.';
    }
    return error(res, message, 409, 'DUPLICATE_RESOURCE');
  }

  // PostgreSQL foreign key violation error (23503)
  if (err.code === '23503') {
    return error(res, 'Referenced record was not found.', 400, 'FOREIGN_KEY_VIOLATION');
  }

  // PostgreSQL invalid UUID syntax error (22P02)
  if (err.code === '22P02') {
    return error(res, 'Invalid ID format provided.', 400, 'INVALID_ID_FORMAT');
  }

  // Known custom application errors (with statusCode)
  if (err.statusCode) {
    return error(res, err.message, err.statusCode, err.code || null);
  }

  // Default fallback 500 Internal Server Error (Never leak stack trace or SQL text!)
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
