const { verifyAccessToken } = require('../utils/jwt');
const { query } = require('../config/database');
const { error } = require('../utils/apiResponse');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    const userResult = await query(
      `SELECT u.id, u.email, u.name, u.role, u.division_id, u.nim, u.phone, u.is_deleted,
              d.name AS division_name
       FROM users u
       LEFT JOIN divisions d ON u.division_id = d.id
       WHERE u.id = $1`,
      [payload.sub]
    );

    const user = userResult.rows[0];

    if (!user || user.is_deleted) {
      return error(res, 'User not found or account deactivated', 401, 'ACCOUNT_INACTIVE');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token has expired', 401, 'TOKEN_EXPIRED');
    }
    return error(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    const userResult = await query(
      `SELECT u.id, u.email, u.name, u.role, u.division_id, u.nim, u.phone, u.is_deleted,
              d.name AS division_name
       FROM users u
       LEFT JOIN divisions d ON u.division_id = d.id
       WHERE u.id = $1 AND u.is_deleted = FALSE`,
      [payload.sub]
    );

    req.user = userResult.rows[0] || null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};
