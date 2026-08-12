const router = require('express').Router();
const controller = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');
const rateLimit = require('express-rate-limit');
const loginLimit = rateLimit({ windowMs: 15*60*1000, limit: 7, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.' } });
const recoveryLimit = rateLimit({ windowMs: 60*60*1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Limite de solicitações atingido. Tente novamente mais tarde.' } });

router.post('/register', asyncHandler(controller.register));
router.post('/login', loginLimit, asyncHandler(controller.login));
router.post('/verify-email', asyncHandler(controller.verifyEmail));
router.post('/resend-verification', recoveryLimit, asyncHandler(controller.resendVerification));
router.post('/forgot-password', recoveryLimit, asyncHandler(controller.forgotPassword));
router.post('/reset-password', recoveryLimit, asyncHandler(controller.resetPassword));

module.exports = router;
