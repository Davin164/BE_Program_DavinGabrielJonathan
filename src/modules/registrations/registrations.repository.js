const { query } = require('../../config/database');

const findByEventId = async (eventId) => {
  const sql = `
    SELECT r.id, r.user_id, r.event_id, r.registered_at,
           u.name, u.email, u.nim, u.phone,
           d.name AS division_name,
           EXISTS(SELECT 1 FROM attendances a WHERE a.event_id = r.event_id AND a.user_id = r.user_id) AS checked_in
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN divisions d ON u.division_id = d.id
    WHERE r.event_id = $1
    ORDER BY r.registered_at ASC;
  `;
  const result = await query(sql, [eventId]);
  return result.rows;
};

const findByUserId = async (userId) => {
  const sql = `
    SELECT r.id, r.event_id, r.registered_at,
           e.title, e.description, e.location, e.start_time, e.end_time,
           EXISTS(SELECT 1 FROM attendances a WHERE a.event_id = r.event_id AND a.user_id = r.user_id) AS is_checked_in
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.user_id = $1 AND e.is_deleted = FALSE
    ORDER BY e.start_time DESC;
  `;
  const result = await query(sql, [userId]);
  return result.rows;
};

const deleteRegistration = async (userId, eventId) => {
  const sql = `
    DELETE FROM registrations
    WHERE user_id = $1 AND event_id = $2
    RETURNING id;
  `;
  const result = await query(sql, [userId, eventId]);
  return result.rowCount > 0;
};

module.exports = {
  findByEventId,
  findByUserId,
  deleteRegistration,
};
