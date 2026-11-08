const { Router } = require('express');
const auditLogsController = require('./audit-logs.controller');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');

const router = Router();

router.use(authenticate, authorize('LEAD'));

router.get('/', auditLogsController.list);

module.exports = router;
