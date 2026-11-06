/**
 * @file auth.controller.js
 * @description Controller handling incoming requests for authentication endpoints.
 * Explicitly sanitizes inputs (Mass assignment protection) and formats standard responses.
 */

const authService = require('./auth.service');
const { success } = require('../../utils/apiResponse');

/**
 * Handle new user registration.
 */
const register = async (req, res, next) => {
  try {
    // Whitelist allowed fields to prevent mass assignment
    const { email, password, name, nim, phone, division_id } = req.body;
    const result = await authService.register({
      email,
      password,
      name,
      nim,
      phone,
      division_id,
    });

    return success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle user login.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle refresh token request.
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle user logout.
 */
const logout = async (req, res) => {
  return success(res, { message: 'Logged out successfully.' }, 200);
};

/**
 * Get profile for authenticated user.
 */
const getMe = async (req, res, next) => {
  try {
    const userProfile = await authService.getMe(req.user.id);
    return success(res, userProfile, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
