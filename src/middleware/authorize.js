const { error } = require('../utils/apiResponse');

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
