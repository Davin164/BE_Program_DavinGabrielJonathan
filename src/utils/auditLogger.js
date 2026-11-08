const { query } = require('../config/database');

const createAuditLog = async ({
  actor_id,
  target_id = null,
  target_table = null,
  action,
  old_value = null,
  new_value = null,
  ip_address = null,
}) => {
  try {
    const text = `
      INSERT INTO audit_logs (
        actor_id,
        target_id,
        target_table,
        action,
        old_value,
        new_value,
        ip_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      actor_id || null,
      target_id || null,
      target_table || null,
      action,
      old_value ? JSON.stringify(old_value) : null,
      new_value ? JSON.stringify(new_value) : null,
      ip_address || null,
    ];

    const result = await query(text, values);
    return result.rows[0];
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
    return null;
  }
};

module.exports = {
  createAuditLog,
};
