const router = require('express').Router();
const controller = require('../controllers/userController');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const lgpd = require('../controllers/lgpdController');

router.use(auth);
router.get('/me', asyncHandler(controller.me));
router.get('/account', asyncHandler(controller.account));
router.put('/me', asyncHandler(controller.updateMe));
router.put('/me/password', asyncHandler(controller.changePassword));
router.get('/me/devices', asyncHandler(controller.devices));
router.delete('/me/devices/:id', asyncHandler(controller.revokeDevice));
router.post('/me/delete-account', asyncHandler(controller.deleteAccount));
router.get('/me/export-data',asyncHandler(lgpd.exportData));

module.exports = router;
