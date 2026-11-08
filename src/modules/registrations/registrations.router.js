const { Router } = require('express');
const registrationsController = require('./registrations.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/my', registrationsController.getMyRegistrations);

module.exports = router;
