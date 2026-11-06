/**
 * @file auditLogger.js
 * @description Utility for recording administrative and security actions into the audit_logs table.
 */

const { query } = require('../config/database');

/**
 * Record an audit log entry.
 * @param {object} params
 * @param {string|null} params.actor_id - ID of the user performing the action
 * @param {string|null} [params.target_id] - ID of the target record affected
 * @param {string|null} [params.target_table] - Name of the target table affected (e.g. 'users', 'events')
 * @param {string} params.action - Action name (e.g. 'ROLE_CHANGE', 'USER_DELETE', 'EVENT_DELETE')
 * @param {object|null} [params.old_value=null] - Previous state before modification
 * @param {object|null} [params.new_value=null] - New state after modification
 * @param {string|null} [params.ip_address=null] - Client IP address
 * @returns {Promise<object|null>} Inserted audit log entry
 */
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
    // Audit logging should not crash the primary operation, but must be logged to stderr
    console.error('Failed to write audit log:', err.message);
    return null;
  }
};

module.exports = {
  createAuditLog,
};
