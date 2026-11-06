/**
 * @file jwt.js
 * @description JSON Web Token helper utilities for signing and verifying
 * access tokens (15m) and refresh tokens (7d).
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate a short-lived access token (default: 15 minutes).
 * @param {object} user - User object containing id, role, email
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};

/**
 * Generate a long-lived refresh token (default: 7 days).
 * @param {object} user - User object containing id
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }
  );
};

/**
 * Verify an access token.
 * @param {string} token - JWT access token
 * @returns {object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Verify a refresh token.
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
