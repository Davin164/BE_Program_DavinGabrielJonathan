/**
 * @file members.validator.js
 * @description Input validation chains for member management endpoints.
 */

const { query, body, param } = require('express-validator');

const listMembersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isString()
    .trim(),
  query('role')
    .optional()
    .isIn(['LEAD', 'DIVISION_HEAD', 'MEMBER'])
    .withMessage('Role filter must be one of: LEAD, DIVISION_HEAD, MEMBER'),
  query('division_id')
    .optional()
    .isUUID()
    .withMessage('division_id must be a valid UUID'),
  query('sort')
    .optional()
    .isIn(['name', 'email', 'role', 'created_at'])
    .withMessage('Sort column must be one of: name, email, role, created_at'),
  query('order')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('Order must be asc or desc'),
];

const memberIdParamValidator = [
  param('id')
    .isUUID()
    .withMessage('Member ID must be a valid UUID'),
];

const createMemberValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['LEAD', 'DIVISION_HEAD', 'MEMBER'])
    .withMessage('Role must be LEAD, DIVISION_HEAD, or MEMBER'),
  body('division_id')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('division_id must be a valid UUID'),
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
];

const updateProfileValidator = [
  ...memberIdParamValidator,
  body('name')
    .optional()
    .trim()
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

const updateRoleValidator = [
  ...memberIdParamValidator,
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['LEAD', 'DIVISION_HEAD', 'MEMBER'])
    .withMessage('Role must be LEAD, DIVISION_HEAD, or MEMBER'),
];

module.exports = {
  listMembersValidator,
  memberIdParamValidator,
  createMemberValidator,
  updateProfileValidator,
  updateRoleValidator,
};
