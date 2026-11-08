const auditLogsRepository = require('./audit-logs.repository');
const { success } = require('../../utils/apiResponse');

const list = async (req, res, next) => {
  try {
    const { page, limit, actor_id, action, target_table } = req.query;
    const { logs, total, totalPages, page: currentPage, limit: currentLimit } =
      await auditLogsRepository.findAuditLogs({
        page,
        limit,
        actor_id,
        action,
        target_table,
      });

    return success(res, logs, 200, {
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
};
