/**
 * @file events.service.js
 * @description Business logic for events, enforcing RBAC (LEAD and DIVISION_HEAD creation)
 * and event ownership checks for modifications.
 */

const eventsRepository = require('./events.repository');
const { createAuditLog } = require('../../utils/auditLogger');

/**
 * List events with filtering and pagination.
 */
const getEvents = async (queryOptions) => {
  return eventsRepository.findEvents(queryOptions);
};

/**
 * Get event details by ID.
 */
const getEventById = async (id, currentUserId = null) => {
  const event = await eventsRepository.findById(id, currentUserId);

  if (!event || event.is_deleted) {
    const err = new Error('Event not found.');
    err.statusCode = 404;
    err.code = 'EVENT_NOT_FOUND';
    throw err;
  }

  return event;
};

/**
 * Create a new event.
 * Role check: LEAD and DIVISION_HEAD only.
 */
const createEvent = async (eventData, currentUser) => {
  if (currentUser.role === 'MEMBER') {
    const err = new Error('Forbidden: Members cannot create events.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const newEvent = await eventsRepository.create({
    ...eventData,
    created_by: currentUser.id,
  });

  return newEvent;
};

/**
 * Update an existing event.
 * Permission: LEAD can update any event; DIVISION_HEAD can only update events they created.
 */
const updateEvent = async (id, fields, currentUser) => {
  const existingEvent = await eventsRepository.findById(id);

  if (!existingEvent || existingEvent.is_deleted) {
    const err = new Error('Event not found.');
    err.statusCode = 404;
    err.code = 'EVENT_NOT_FOUND';
    throw err;
  }

  if (currentUser.role === 'MEMBER') {
    const err = new Error('Forbidden: Members cannot modify events.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (currentUser.role === 'DIVISION_HEAD' && existingEvent.created_by !== currentUser.id) {
    const err = new Error('Forbidden: You can only edit events created by yourself.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Validate start_time and end_time if updated
  const startTime = fields.start_time || existingEvent.start_time;
  const endTime = fields.end_time || existingEvent.end_time;
  if (new Date(endTime) <= new Date(startTime)) {
    const err = new Error('end_time must be strictly after start_time.');
    err.statusCode = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  const updatedEvent = await eventsRepository.update(id, fields);
  return updatedEvent;
};

/**
 * Soft delete an event.
 * Permission: LEAD can delete any event; DIVISION_HEAD can only delete events they created.
 */
const deleteEvent = async (id, currentUser, ipAddress) => {
  const existingEvent = await eventsRepository.findById(id);

  if (!existingEvent || existingEvent.is_deleted) {
    const err = new Error('Event not found.');
    err.statusCode = 404;
    err.code = 'EVENT_NOT_FOUND';
    throw err;
  }

  if (currentUser.role === 'MEMBER') {
    const err = new Error('Forbidden: Members cannot delete events.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (currentUser.role === 'DIVISION_HEAD' && existingEvent.created_by !== currentUser.id) {
    const err = new Error('Forbidden: You can only delete events created by yourself.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  await eventsRepository.softDelete(id);

  await createAuditLog({
    actor_id: currentUser.id,
    target_id: id,
    target_table: 'events',
    action: 'EVENT_DELETE',
    old_value: { title: existingEvent.title, is_deleted: false },
    new_value: { is_deleted: true },
    ip_address: ipAddress,
  });

  return { message: 'Event successfully deleted.' };
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
