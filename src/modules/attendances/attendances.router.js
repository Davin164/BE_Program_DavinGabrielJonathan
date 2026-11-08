const { Router } = require('express');
const attendancesController = require('./attendances.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/my', attendancesController.getMyAttendances);

module.exports = router;
