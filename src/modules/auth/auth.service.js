/**
 * @file auth.service.js
 * @description Business logic for user registration, authentication, and token management.
 */

const { query } = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../../utils/jwt');

/**
 * Register a new member.
 * Role is strictly enforced as MEMBER regardless of any requested role (Mass assignment prevention).
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.name
 * @param {string} [params.nim]
 * @param {string} [params.phone]
 * @param {string} [params.division_id]
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
const register = async ({ email, password, name, nim = null, phone = null, division_id = null }) => {
  // Check if active user already exists with this email
  const existingUserResult = await query(
    'SELECT id, is_deleted FROM users WHERE email = $1',
    [email]
  );

  if (existingUserResult.rows.length > 0) {
    const err = new Error('An account with this email address already exists.');
    err.statusCode = 409;
    err.code = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  // Hash password using bcrypt (12 rounds)
  const passwordHash = await hashPassword(password);

  // Insert user with default role 'MEMBER'
  const insertQuery = `
    INSERT INTO users (
      email,
      name,
      password_hash,
      role,
      division_id,
      nim,
      phone
    )
    VALUES ($1, $2, $3, 'MEMBER', $4, $5, $6)
    RETURNING id, email, name, role, division_id, nim, phone, created_at;
  `;
  const insertValues = [email, name, passwordHash, division_id || null, nim || null, phone || null];
  const result = await query(insertQuery, insertValues);
  const user = result.rows[0];

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * Authenticate user credentials and issue JWT tokens.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
const login = async ({ email, password }) => {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.password_hash, u.role, u.division_id, u.nim, u.phone, u.is_deleted,
            d.name AS division_name
     FROM users u
     LEFT JOIN divisions d ON u.division_id = d.id
     WHERE u.email = $1`,
    [email]
  );

  const user = result.rows[0];

  if (!user || user.is_deleted) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Omit password_hash before returning user data
  delete user.password_hash;
  delete user.is_deleted;

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * Reissue tokens using a valid refresh token.
 * @param {string} token - Refresh token
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
const refresh = async (token) => {
  try {
    const payload = verifyRefreshToken(token);

    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.is_deleted
       FROM users u
       WHERE u.id = $1`,
      [payload.sub]
    );

    const user = result.rows[0];

    if (!user || user.is_deleted) {
      const err = new Error('User no longer exists or has been deactivated.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (err) {
    const errorObj = new Error('Invalid or expired refresh token.');
    errorObj.statusCode = 401;
    errorObj.code = 'INVALID_REFRESH_TOKEN';
    throw errorObj;
  }
};

/**
 * Fetch profile information for the current authenticated user.
 * @param {string} userId - UUID of user
 * @returns {Promise<object>} User profile
 */
const getMe = async (userId) => {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.division_id, u.nim, u.phone, u.created_at, u.updated_at,
            d.name AS division_name
     FROM users u
     LEFT JOIN divisions d ON u.division_id = d.id
     WHERE u.id = $1 AND u.is_deleted = FALSE`,
    [userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('User profile not found.');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  return result.rows[0];
};

module.exports = {
  register,
  login,
  refresh,
  getMe,
};
