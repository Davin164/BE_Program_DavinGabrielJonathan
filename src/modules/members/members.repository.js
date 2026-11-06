/**
 * @file members.repository.js
 * @description Database access layer for users and members table.
 * All queries are strictly parameterized with SQL injection protections.
 */

const { query } = require('../../config/database');

/**
 * Retrieve paginated list of members with filtering and sorting.
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.search]
 * @param {string} [params.role]
 * @param {string} [params.division_id]
 * @param {string} [params.sort='created_at']
 * @param {string} [params.order='desc']
 * @returns {Promise<{ members: Array<object>, total: number, page: number, limit: number, totalPages: number }>}
 */
const findMembers = async ({
  page = 1,
  limit = 10,
  search,
  role,
  division_id,
  sort = 'created_at',
  order = 'desc',
}) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  // Whitelist sort fields and order directions to strictly prevent SQL injection
  const allowedSorts = ['name', 'email', 'role', 'created_at'];
  const allowedOrders = ['asc', 'desc'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = allowedOrders.includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';

  const params = [];
  let whereClause = 'WHERE u.is_deleted = FALSE';

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.nim ILIKE $${params.length})`;
  }
  if (role) {
    params.push(role);
    whereClause += ` AND u.role = $${params.length}`;
  }
  if (division_id) {
    params.push(division_id);
    whereClause += ` AND u.division_id = $${params.length}`;
  }

  // Count total matching records for pagination metadata
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users u
    ${whereClause}
  `;
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Retrieve paginated records
  const queryParams = [...params, limitNum, offset];
  const selectQuery = `
    SELECT u.id, u.email, u.name, u.role, u.nim, u.phone, u.division_id, u.created_at, u.updated_at,
           d.name AS division_name
    FROM users u
    LEFT JOIN divisions d ON u.division_id = d.id
    ${whereClause}
    ORDER BY u.${safeSort} ${safeOrder}
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const result = await query(selectQuery, queryParams);

  return {
    members: result.rows,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

/**
 * Find user by ID (active or inactive).
 * @param {string} id - UUID
 * @returns {Promise<object|null>}
 */
const findById = async (id) => {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.nim, u.phone, u.division_id, u.is_deleted, u.deleted_at, u.created_at, u.updated_at,
            d.name AS division_name
     FROM users u
     LEFT JOIN divisions d ON u.division_id = d.id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Update member profile fields.
 * @param {string} id - UUID
 * @param {object} fields - Whitelisted fields: name, nim, phone, division_id
 * @returns {Promise<object>} Updated user
 */
const updateProfile = async (id, fields) => {
  const keys = Object.keys(fields).filter((k) =>
    ['name', 'nim', 'phone', 'division_id'].includes(k) && fields[k] !== undefined
  );

  if (keys.length === 0) {
    return findById(id);
  }

  const setClauses = [];
  const values = [];

  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(fields[key]);
  });

  values.push(id);
  const sql = `
    UPDATE users
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $${values.length} AND is_deleted = FALSE
    RETURNING id, email, name, role, division_id, nim, phone, updated_at;
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
};

/**
 * Update user role.
 * @param {string} id - UUID
 * @param {string} newRole - 'LEAD' | 'DIVISION_HEAD' | 'MEMBER'
 * @returns {Promise<object>} Updated user
 */
const updateRole = async (id, newRole) => {
  const sql = `
    UPDATE users
    SET role = $1, updated_at = NOW()
    WHERE id = $2 AND is_deleted = FALSE
    RETURNING id, email, name, role, division_id, nim, phone, updated_at;
  `;
  const result = await query(sql, [newRole, id]);
  return result.rows[0] || null;
};

/**
 * Soft delete user.
 * @param {string} id - UUID
 * @returns {Promise<boolean>}
 */
const softDelete = async (id) => {
  const sql = `
    UPDATE users
    SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND is_deleted = FALSE
    RETURNING id;
  `;
  const result = await query(sql, [id]);
  return result.rowCount > 0;
};

module.exports = {
  findMembers,
  findById,
  updateProfile,
  updateRole,
  softDelete,
};
