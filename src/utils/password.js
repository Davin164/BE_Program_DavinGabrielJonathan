/**
 * @file password.js
 * @description Password hashing and verification using bcrypt (12 rounds).
 */

const bcrypt = require('bcrypt');
const env = require('../config/env');

/**
 * Hash a plain text password with bcrypt.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Salted and hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
};

/**
 * Compare a plain text password with a stored hash.
 * @param {string} password - Plain text password
 * @param {string} hash - Stored bcrypt hash
 * @returns {Promise<boolean>} True if match, false otherwise
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
