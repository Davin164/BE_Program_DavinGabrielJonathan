/**
 * @file attendances.service.js
 * @description Business logic for attendance check-ins.
 * Enforces:
 * 1. Attendance only valid during the event time window (start_time <= now <= end_time)
 * 2. Attendance only permitted for previously registered participants
 * 3. Idempotent check-ins via PostgreSQL ON CONFLICT DO NOTHING (no duplicates)
 */

const { query } = require('../../config/database');
const attendancesRepository = require('./attendances.repository');

/**
 * Perform idempotent attendance check-in for an event.
 * Validates time window, registration status, and idempotently records attendance.
 *
 * @param {string} userId - UUID of user attempting check-in
 * @param {string} eventId - UUID of event
 * @returns {Promise<object>} Attendance record
 */
const checkIn = async (userId, eventId) => {
  // 1. Verify that the event exists and is not soft-deleted
  const eventResult = await query(
    'SELECT id, title, is_deleted, start_time, end_time FROM events WHERE id = $1 AND is_deleted = FALSE',
    [eventId]
  );

  if (eventResult.rows.length === 0) {
    const err = new Error('Event tidak ditemukan atau telah dihapus.');
    err.statusCode = 404;
    err.code = 'EVENT_NOT_FOUND';
    throw err;
  }

  const event = eventResult.rows[0];
  const now = new Date();
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);

  // 2. Validate time window: Check-in only allowed while event is active
  if (now < startTime || now > endTime) {
    const err = new Error('Absensi hanya valid pada jendela waktu pelaksanaan event.');
    err.statusCode = 400;
    err.code = 'OUTSIDE_EVENT_WINDOW';
    throw err;
  }

  // 3. Validate registration: Check-in only valid for registered participants
  const registrationResult = await query(
    'SELECT id FROM registrations WHERE user_id = $1 AND event_id = $2',
    [userId, eventId]
  );

  if (registrationResult.rows.length === 0) {
    const err = new Error('Hanya peserta terdaftar yang dapat melakukan absensi.');
    err.statusCode = 403;
    err.code = 'NOT_REGISTERED';
    throw err;
  }

  // 4. Record attendance idempotently
  const { attendance, created } = await attendancesRepository.recordCheckIn(userId, eventId);

  return {
    ...attendance,
    alreadyCheckedIn: !created,
    message: created
      ? 'Absensi berhasil dicatat.'
      : 'Anda sudah melakukan absensi untuk event ini sebelumnya.',
  };
};

/**
 * Retrieve all attendees for an event (Leadership only).
 */
const getEventAttendances = async (eventId, currentUser) => {
  return attendancesRepository.findByEventId(eventId);
};

/**
 * Retrieve attendance history for the logged in user.
 */
const getMyAttendances = async (userId) => {
  return attendancesRepository.findByUserId(userId);
};

module.exports = {
  checkIn,
  getEventAttendances,
  getMyAttendances,
};
