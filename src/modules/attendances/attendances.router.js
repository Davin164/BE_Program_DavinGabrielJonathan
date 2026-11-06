/**
 * @file attendances.router.js
 * @description Express router for attendance endpoints.
 */

const { Router } = require('express');
const attendancesController = require('./attendances.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.use(authenticate);

// Get logged-in user's attendance records
router.get('/my', attendancesController.getMyAttendances);

module.exports = router;
