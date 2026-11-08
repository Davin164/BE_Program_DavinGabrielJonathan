const { query } = require('../../config/database');

const findEvents = async ({
  page = 1,
  limit = 10,
  search,
  upcoming,
  sort = 'start_time',
  order = 'asc',
}) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const allowedSorts = ['title', 'start_time', 'created_at', 'quota'];
  const allowedOrders = ['asc', 'desc'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'start_time';
  const safeOrder = allowedOrders.includes(order?.toLowerCase()) ? order.toLowerCase() : 'asc';

  const params = [];
  let whereClause = 'WHERE e.is_deleted = FALSE';

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (e.title ILIKE $${params.length} OR e.description ILIKE $${params.length} OR e.location ILIKE $${params.length})`;
  }

  if (upcoming === true || upcoming === 'true') {
    whereClause += ' AND e.end_time > NOW()';
  } else if (upcoming === false || upcoming === 'false') {
    whereClause += ' AND e.end_time <= NOW()';
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM events e
    ${whereClause}
  `;
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const queryParams = [...params, limitNum, offset];
  const selectQuery = `
    SELECT e.id, e.title, e.description, e.quota, e.start_time, e.end_time, e.location,
           e.created_by, e.created_at, e.updated_at,
           u.name AS creator_name,
           u.email AS creator_email,
           COUNT(r.id)::int AS registered_count,
           GREATEST(0, e.quota - COUNT(r.id)::int) AS remaining_quota
    FROM events e
    JOIN users u ON e.created_by = u.id
    LEFT JOIN registrations r ON e.id = r.event_id
    ${whereClause}
    GROUP BY e.id, u.name, u.email
    ORDER BY e.${safeSort} ${safeOrder}
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const result = await query(selectQuery, queryParams);

  return {
    events: result.rows,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

const findById = async (id, currentUserId = null) => {
  const params = [id];
  let userStatusSelect = 'FALSE AS is_registered, FALSE AS is_checked_in';

  if (currentUserId) {
    params.push(currentUserId);
    userStatusSelect = `
      EXISTS(SELECT 1 FROM registrations WHERE event_id = e.id AND user_id = $2) AS is_registered,
      EXISTS(SELECT 1 FROM attendances WHERE event_id = e.id AND user_id = $2) AS is_checked_in
    `;
  }

  const sql = `
    SELECT e.id, e.title, e.description, e.quota, e.start_time, e.end_time, e.location,
           e.created_by, e.is_deleted, e.created_at, e.updated_at,
           u.name AS creator_name,
           u.email AS creator_email,
           COUNT(DISTINCT r.id)::int AS registered_count,
           GREATEST(0, e.quota - COUNT(DISTINCT r.id)::int) AS remaining_quota,
           ${userStatusSelect}
    FROM events e
    JOIN users u ON e.created_by = u.id
    LEFT JOIN registrations r ON e.id = r.event_id
    WHERE e.id = $1
    GROUP BY e.id, u.name, u.email
  `;

  const result = await query(sql, params);
  return result.rows[0] || null;
};

const create = async ({ title, description, quota, start_time, end_time, location, created_by }) => {
  const sql = `
    INSERT INTO events (
      title,
      description,
      quota,
      start_time,
      end_time,
      location,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, title, description, quota, start_time, end_time, location, created_by, created_at, updated_at;
  `;
  const values = [
    title,
    description || null,
    quota,
    start_time,
    end_time,
    location || null,
    created_by,
  ];

  const result = await query(sql, values);
  return result.rows[0];
};

const update = async (id, fields) => {
  const allowedKeys = ['title', 'description', 'quota', 'start_time', 'end_time', 'location'];
  const keys = Object.keys(fields).filter((k) => allowedKeys.includes(k) && fields[k] !== undefined);

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
    UPDATE events
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $${values.length} AND is_deleted = FALSE
    RETURNING id, title, description, quota, start_time, end_time, location, created_by, created_at, updated_at;
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
};

const softDelete = async (id) => {
  const sql = `
    UPDATE events
    SET is_deleted = TRUE, updated_at = NOW()
    WHERE id = $1 AND is_deleted = FALSE
    RETURNING id;
  `;
  const result = await query(sql, [id]);
  return result.rowCount > 0;
};

module.exports = {
  findEvents,
  findById,
  create,
  update,
  softDelete,
};
