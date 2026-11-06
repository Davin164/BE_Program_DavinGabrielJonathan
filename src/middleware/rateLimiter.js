/**
 * @file rateLimiter.js
 * @description Rate limiting middleware configurations to prevent brute force and DDoS attacks.
 * Automatically bypassed in test environment to avoid hindering automated test suites.
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { error } = require('../utils/apiResponse');

const isTest = env.NODE_ENV === 'test';

/**
 * Custom response handler for rate limit violations.
 */
const rateLimitHandler = (req, res) => {
  return error(
    res,
    'Too many requests from this IP address. Please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED'
  );
};

/**
 * Strict limiter for sensitive authentication endpoints (login, register).
 * Allows 15 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => isTest,
});

/**
 * Standard limiter for general API endpoints.
 * Allows 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => isTest,
});

module.exports = {
  authLimiter,
  apiLimiter,
};
