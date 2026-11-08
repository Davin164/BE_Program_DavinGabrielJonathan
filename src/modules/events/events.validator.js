const { body, query, param } = require('express-validator');

const eventIdParamValidator = [
  param('id')
    .isUUID()
    .withMessage('Event ID must be a valid UUID'),
];

const createEventValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Event title must be between 3 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .trim(),
  body('quota')
    .notEmpty()
    .withMessage('Quota is required')
    .isInt({ min: 1 })
    .withMessage('Quota must be an integer greater than 0'),
  body('start_time')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('start_time must be a valid ISO 8601 date string'),
  body('end_time')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('end_time must be a valid ISO 8601 date string')
    .custom((endTime, { req }) => {
      if (new Date(endTime) <= new Date(req.body.start_time)) {
        throw new Error('end_time must be strictly after start_time');
      }
      return true;
    }),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),
];

const updateEventValidator = [
  ...eventIdParamValidator,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Event title must be between 3 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .trim(),
  body('quota')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quota must be an integer greater than 0'),
  body('start_time')
    .optional()
    .isISO8601()
    .withMessage('start_time must be a valid ISO 8601 date string'),
  body('end_time')
    .optional()
    .isISO8601()
    .withMessage('end_time must be a valid ISO 8601 date string')
    .custom((endTime, { req }) => {
      if (req.body.start_time && new Date(endTime) <= new Date(req.body.start_time)) {
        throw new Error('end_time must be strictly after start_time');
      }
      return true;
    }),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),
];

const listEventsValidator = [
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
  query('upcoming')
    .optional()
    .isBoolean()
    .withMessage('upcoming must be a boolean (true/false)'),
  query('sort')
    .optional()
    .isIn(['title', 'start_time', 'created_at', 'quota'])
    .withMessage('Sort column must be one of: title, start_time, created_at, quota'),
  query('order')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('Order must be asc or desc'),
];

module.exports = {
  eventIdParamValidator,
  createEventValidator,
  updateEventValidator,
  listEventsValidator,
};
