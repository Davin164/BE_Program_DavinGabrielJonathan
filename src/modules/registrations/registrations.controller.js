/**
 * @file registrations.controller.js
 * @description Controller handling incoming requests for registration endpoints.
 */

const registrationsService = require('./registrations.service');
const { success } = require('../../utils/apiResponse');

/**
 * Register current user for an event.
 */
const register = async (req, res, next) => {
  try {
    const registration = await registrationsService.registerForEvent(
      req.user.id,
      req.params.id
    );
    return success(res, registration, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel current user's registration.
 */
const cancelRegistration = async (req, res, next) => {
  try {
    const result = await registrationsService.cancelRegistration(
      req.user.id,
      req.params.id
    );
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all registrations for an event (Leadership only).
 */
const getEventRegistrations = async (req, res, next) => {
  try {
    const registrations = await registrationsService.getEventRegistrations(
      req.params.id,
      req.user
    );
    return success(res, registrations, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated user's registrations.
 */
const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await registrationsService.getMyRegistrations(req.user.id);
    return success(res, registrations, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  cancelRegistration,
  getEventRegistrations,
  getMyRegistrations,
};
