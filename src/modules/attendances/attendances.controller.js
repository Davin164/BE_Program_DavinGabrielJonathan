/**
 * @file attendances.controller.js
 * @description Controller handling incoming requests for attendance check-ins.
 */

const attendancesService = require('./attendances.service');
const { success } = require('../../utils/apiResponse');

/**
 * Handle idempotent event check-in.
 */
const checkIn = async (req, res, next) => {
  try {
    const result = await attendancesService.checkIn(req.user.id, req.params.id);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * List all attendees for an event (Leadership only).
 */
const getEventAttendances = async (req, res, next) => {
  try {
    const attendees = await attendancesService.getEventAttendances(
      req.params.id,
      req.user
    );
    return success(res, attendees, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get current user's attendance records.
 */
const getMyAttendances = async (req, res, next) => {
  try {
    const attendances = await attendancesService.getMyAttendances(req.user.id);
    return success(res, attendances, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkIn,
  getEventAttendances,
  getMyAttendances,
};
