/**
 * @file attendances.repository.js
 * @description Database access layer for attendance records.
 */

const { query } = require('../../config/database');

/**
 * Record attendance check-in idempotently using ON CONFLICT DO NOTHING.
 * @param {string} userId - UUID
 * @param {string} eventId - UUID
 * @returns {Promise<{ attendance: object, created: boolean }>}
 */
const recordCheckIn = async (userId, eventId) => {
  const insertSql = `
    INSERT INTO attendances (user_id, event_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, event_id) DO NOTHING
    RETURNING id, user_id, event_id, checked_in_at;
  `;
  const insertResult = await query(insertSql, [userId, eventId]);

  if (insertResult.rows.length > 0) {
    return { attendance: insertResult.rows[0], created: true };
  }

  // Already checked in: fetch existing record to return idempotently
  const selectSql = `
    SELECT id, user_id, event_id, checked_in_at
    FROM attendances
    WHERE user_id = $1 AND event_id = $2;
  `;
  const existingResult = await query(selectSql, [userId, eventId]);
  return { attendance: existingResult.rows[0], created: false };
};

/**
 * Find all attendance records for an event.
 */
const findByEventId = async (eventId) => {
  const sql = `
    SELECT a.id, a.user_id, a.event_id, a.checked_in_at,
           u.name, u.email, u.nim, u.phone,
           d.name AS division_name
    FROM attendances a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN divisions d ON u.division_id = d.id
    WHERE a.event_id = $1
    ORDER BY a.checked_in_at DESC;
  `;
  const result = await query(sql, [eventId]);
  return result.rows;
};

/**
 * Find all attendance records for a user.
 */
const findByUserId = async (userId) => {
  const sql = `
    SELECT a.id, a.event_id, a.checked_in_at,
           e.title, e.start_time, e.end_time, e.location
    FROM attendances a
    JOIN events e ON a.event_id = e.id
    WHERE a.user_id = $1 AND e.is_deleted = FALSE
    ORDER BY a.checked_in_at DESC;
  `;
  const result = await query(sql, [userId]);
  return result.rows;
};

module.exports = {
  recordCheckIn,
  findByEventId,
  findByUserId,
};
