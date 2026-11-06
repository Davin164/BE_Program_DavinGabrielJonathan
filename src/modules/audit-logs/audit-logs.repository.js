/**
 * @file audit-logs.repository.js
 * @description Database access layer for audit logs.
 */

const { query } = require('../../config/database');

/**
 * Retrieve paginated audit logs with actor user details and optional filters.
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.actor_id]
 * @param {string} [params.action]
 * @param {string} [params.target_table]
 * @returns {Promise<{ logs: Array<object>, total: number, page: number, limit: number, totalPages: number }>}
 */
const findAuditLogs = async ({
  page = 1,
  limit = 20,
  actor_id,
  action,
  target_table,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const params = [];
  const conditions = [];

  if (actor_id) {
    params.push(actor_id);
    conditions.push(`a.actor_id = $${params.length}`);
  }

  if (action) {
    params.push(action);
    conditions.push(`a.action = $${params.length}`);
  }

  if (target_table) {
    params.push(target_table);
    conditions.push(`a.target_table = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM audit_logs a
    ${whereClause}
  `;
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const queryParams = [...params, limitNum, offset];
  const selectQuery = `
    SELECT a.id, a.actor_id, a.target_id, a.target_table, a.action,
           a.old_value, a.new_value, a.ip_address, a.created_at,
           u.name AS actor_name,
           u.email AS actor_email
    FROM audit_logs a
    LEFT JOIN users u ON a.actor_id = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const result = await query(selectQuery, queryParams);

  return {
    logs: result.rows,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

module.exports = {
  findAuditLogs,
};
