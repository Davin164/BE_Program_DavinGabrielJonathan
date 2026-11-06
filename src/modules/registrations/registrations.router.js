/**
 * @file registrations.router.js
 * @description Express router for user registrations.
 */

const { Router } = require('express');
const registrationsController = require('./registrations.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.use(authenticate);

// Get my event registrations
router.get('/my', registrationsController.getMyRegistrations);

module.exports = router;
