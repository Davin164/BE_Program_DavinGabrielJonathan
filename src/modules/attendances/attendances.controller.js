const attendancesService = require('./attendances.service');
const { success } = require('../../utils/apiResponse');

const checkIn = async (req, res, next) => {
  try {
    const result = await attendancesService.checkIn(req.user.id, req.params.id);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

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
