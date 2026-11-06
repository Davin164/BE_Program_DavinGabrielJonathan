/**
 * @file audit-logs.router.js
 * @description Express router for audit log queries.
 * Access is strictly restricted to users with the 'LEAD' role.
 */

const { Router } = require('express');
const auditLogsController = require('./audit-logs.controller');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');

const router = Router();

// Strictly LEAD access only
router.use(authenticate, authorize('LEAD'));

// GET /api/audit-logs
router.get('/', auditLogsController.list);

module.exports = router;
