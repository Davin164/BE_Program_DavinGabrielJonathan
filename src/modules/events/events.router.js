/**
 * @file events.router.js
 * @description Express router for events, including nested registration and attendance routes.
 */

const { Router } = require('express');
const eventsController = require('./events.controller');
const registrationsController = require('../registrations/registrations.controller');
const attendancesController = require('../attendances/attendances.controller');
const {
  listEventsValidator,
  eventIdParamValidator,
  createEventValidator,
  updateEventValidator,
} = require('./events.validator');
const { validate } = require('../../middleware/validate');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');

const router = Router();

const CORE_ROLES = [
  'LEAD',
  'CO_LEAD',
  'SECRETARY_1',
  'SECRETARY_2',
  'TREASURER_1',
  'TREASURER_2',
  'CORE_TEAM',
];

// Public / Semi-public event exploration (optionalAuth identifies caller if logged in)
router.get('/', optionalAuth, listEventsValidator, validate, eventsController.list);
router.get('/:id', optionalAuth, eventIdParamValidator, validate, eventsController.getById);

// Event lifecycle management (Chapter leadership & core team)
router.post(
  '/',
  authenticate,
  authorize(...CORE_ROLES),
  createEventValidator,
  validate,
  eventsController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(...CORE_ROLES),
  updateEventValidator,
  validate,
  eventsController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize(...CORE_ROLES),
  eventIdParamValidator,
  validate,
  eventsController.deleteEvent
);

// Event Registration routes
router.post(
  '/:id/register',
  authenticate,
  eventIdParamValidator,
  validate,
  registrationsController.register
);

router.delete(
  '/:id/register',
  authenticate,
  eventIdParamValidator,
  validate,
  registrationsController.cancelRegistration
);

router.get(
  '/:id/registrations',
  authenticate,
  authorize(...CORE_ROLES),
  eventIdParamValidator,
  validate,
  registrationsController.getEventRegistrations
);

// Event Attendance check-in routes
router.post(
  '/:id/checkin',
  authenticate,
  eventIdParamValidator,
  validate,
  attendancesController.checkIn
);

router.get(
  '/:id/attendances',
  authenticate,
  authorize(...CORE_ROLES),
  eventIdParamValidator,
  validate,
  attendancesController.getEventAttendances
);

module.exports = router;
