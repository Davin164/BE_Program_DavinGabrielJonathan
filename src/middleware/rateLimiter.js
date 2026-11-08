const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { error } = require('../utils/apiResponse');

const isTest = env.NODE_ENV === 'test';

const rateLimitHandler = (req, res) => {
  return error(
    res,
    'Too many requests from this IP address. Please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED'
  );
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => isTest,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
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
