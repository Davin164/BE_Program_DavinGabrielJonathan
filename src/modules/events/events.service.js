const eventsRepository = require('./events.repository');
const { createAuditLog } = require('../../utils/auditLogger');

const getEvents = async (queryOptions) => {
  return eventsRepository.findEvents(queryOptions);
};

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

  if (currentUser.role !== 'LEAD' && existingEvent.created_by !== currentUser.id) {
    const err = new Error('Forbidden: You can only edit events created by yourself.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

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

const deleteEvent = async (id, currentUser, ipAddress = null) => {
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

  if (currentUser.role !== 'LEAD' && existingEvent.created_by !== currentUser.id) {
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
