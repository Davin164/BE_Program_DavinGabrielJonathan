const registrationsService = require('./registrations.service');
const { success } = require('../../utils/apiResponse');

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
