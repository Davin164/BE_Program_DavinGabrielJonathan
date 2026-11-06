/**
 * @file authorize.js
 * @description Role-Based Access Control (RBAC) middleware.
 * Verifies that the authenticated user possesses one of the required roles.
 */

const { error } = require('../utils/apiResponse');

/**
 * Authorize middleware generator.
 * @param {...string} allowedRoles - List of allowed roles (e.g. 'LEAD', 'DIVISION_HEAD', 'MEMBER')
 * @returns {import('express').RequestHandler}
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(
        res,
        'Forbidden: You do not have permission to perform this action',
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};

module.exports = {
  authorize,
};
