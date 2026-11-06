/**
 * @file apiResponse.js
 * @description Standardized API response formatters.
 * Never includes stack traces or internal implementation details in production.
 */

/**
 * Send a standardized success JSON response.
 * @param {import('express').Response} res - Express response object
 * @param {any} data - Payload data to return
 * @param {number} [statusCode=200] - HTTP status code
 * @param {object|null} [meta=null] - Optional pagination or metadata
 * @returns {import('express').Response}
 */
const success = (res, data, statusCode = 200, meta = null) => {
  const response = { success: true, data };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

/**
 * Send a standardized error JSON response.
 * @param {import('express').Response} res - Express response object
 * @param {string} message - User-facing error message
 * @param {number} [statusCode=400] - HTTP status code
 * @param {string|null} [code=null] - Machine-readable error code (e.g., 'EVENT_FULL')
 * @returns {import('express').Response}
 */
const error = (res, message, statusCode = 400, code = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(code && { code }),
  });
};

module.exports = {
  success,
  error,
};
