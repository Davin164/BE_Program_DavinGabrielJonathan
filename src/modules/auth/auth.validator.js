/**
 * @file auth.validator.js
 * @description Input validation chains for authentication endpoints.
 */

const { body } = require('express-validator');

const registerValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('nim')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('NIM must not exceed 20 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must not exceed 20 characters'),
  body('division_id')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('division_id must be a valid UUID'),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const googleLoginValidator = [
  body('supabase_token')
    .notEmpty()
    .withMessage('Supabase OAuth access token is required'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 }),
];

const refreshTokenValidator = [
  body()
    .custom((val) => Boolean(val?.refreshToken || val?.refresh_token))
    .withMessage('Refresh token is required'),
];

module.exports = {
  registerValidator,
  loginValidator,
  googleLoginValidator,
  refreshTokenValidator,
};
