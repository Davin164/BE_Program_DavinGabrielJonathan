/**
 * @file events.controller.js
 * @description Controller handling incoming requests for event endpoints.
 */

const eventsService = require('./events.service');
const { success } = require('../../utils/apiResponse');

/**
 * List events.
 */
const list = async (req, res, next) => {
  try {
    const { page, limit, search, upcoming, sort, order } = req.query;
    const { events, total, totalPages, page: currentPage, limit: currentLimit } =
      await eventsService.getEvents({ page, limit, search, upcoming, sort, order });

    return success(res, events, 200, {
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get event details by ID.
 */
const getById = async (req, res, next) => {
  try {
    const event = await eventsService.getEventById(req.params.id, req.user?.id || null);
    return success(res, event, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new event.
 */
const create = async (req, res, next) => {
  try {
    const { title, description, quota, start_time, end_time, location } = req.body;
    const newEvent = await eventsService.createEvent(
      { title, description, quota, start_time, end_time, location },
      req.user
    );

    return success(res, newEvent, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing event.
 */
const update = async (req, res, next) => {
  try {
    const { title, description, quota, start_time, end_time, location } = req.body;
    const updatedEvent = await eventsService.updateEvent(
      req.params.id,
      { title, description, quota, start_time, end_time, location },
      req.user
    );

    return success(res, updatedEvent, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an event.
 */
const deleteEvent = async (req, res, next) => {
  try {
    const result = await eventsService.deleteEvent(req.params.id, req.user, req.ip);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  deleteEvent,
};
