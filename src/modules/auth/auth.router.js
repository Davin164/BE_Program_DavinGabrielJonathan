const { Router } = require('express');
const authController = require('./auth.controller');
const {
  registerValidator,
  loginValidator,
  googleLoginValidator,
  refreshTokenValidator,
} = require('./auth.validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = Router();

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/google', authLimiter, googleLoginValidator, validate, authController.googleLogin);
router.post('/refresh', refreshTokenValidator, validate, authController.refresh);

router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
