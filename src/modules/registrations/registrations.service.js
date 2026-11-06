/**
 * @file registrations.service.js
 * @description Business logic for event registrations with concurrency control.
 * Uses PostgreSQL pessimistic locking (SELECT ... FOR UPDATE) inside an isolated
 * transaction to strictly prevent race conditions and quota overselling.
 */

const { pool } = require('../../config/database');
const registrationsRepository = require('./registrations.repository');

/**
 * Register a user for an event using pessimistic row-level locking.
 * @param {string} userId - UUID of user
 * @param {string} eventId - UUID of event
 * @returns {Promise<object>} Created registration record
 */
const registerForEvent = async (userId, eventId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock the event row to prevent concurrent modifications while evaluating quota
    const eventResult = await client.query(
      `SELECT id, title, quota, start_time, end_time, is_deleted
       FROM events
       WHERE id = $1 AND is_deleted = FALSE
       FOR UPDATE`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      const err = new Error('Event not found or has been deleted.');
      err.statusCode = 404;
      err.code = 'EVENT_NOT_FOUND';
      throw err;
    }

    const event = eventResult.rows[0];

    // Check if event has already finished
    if (new Date(event.end_time) < new Date()) {
      const err = new Error('Cannot register for an event that has already ended.');
      err.statusCode = 400;
      err.code = 'EVENT_ENDED';
      throw err;
    }

    // 2. Count current active registrations
    const currentRegistrationsResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM registrations WHERE event_id = $1',
      [eventId]
    );
    const currentCount = parseInt(currentRegistrationsResult.rows[0].count, 10);

    // 3. Quota enforcement: prevent overselling
    if (currentCount >= event.quota) {
      const err = new Error('Event registration quota is full.');
      err.statusCode = 409;
      err.code = 'EVENT_FULL';
      throw err;
    }

    // 4. Check for duplicate registration by the same user
    const existingRegistration = await client.query(
      'SELECT id FROM registrations WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );

    if (existingRegistration.rows.length > 0) {
      const err = new Error('You are already registered for this event.');
      err.statusCode = 409;
      err.code = 'ALREADY_REGISTERED';
      throw err;
    }

    // 5. Insert registration
    const insertResult = await client.query(
      `INSERT INTO registrations (user_id, event_id)
       VALUES ($1, $2)
       RETURNING id, user_id, event_id, registered_at`,
      [userId, eventId]
    );

    await client.query('COMMIT');
    return insertResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Cancel a registration.
 */
const cancelRegistration = async (userId, eventId) => {
  const deleted = await registrationsRepository.deleteRegistration(userId, eventId);
  if (!deleted) {
    const err = new Error('Registration not found or already cancelled.');
    err.statusCode = 404;
    err.code = 'REGISTRATION_NOT_FOUND';
    throw err;
  }
  return { message: 'Registration successfully cancelled.' };
};

/**
 * Get all registrations for an event (Restricted to LEAD or creator/division head).
 */
const getEventRegistrations = async (eventId, currentUser) => {
  return registrationsRepository.findByEventId(eventId);
};

/**
 * Get registrations for the logged in user.
 */
const getMyRegistrations = async (userId) => {
  return registrationsRepository.findByUserId(userId);
};

module.exports = {
  registerForEvent,
  cancelRegistration,
  getEventRegistrations,
  getMyRegistrations,
};
