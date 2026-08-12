const router = require('express').Router();
const controller = require('../controllers/projectController');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(auth);
router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.post('/:id/secure-delete', asyncHandler(controller.secureRemove));

module.exports = router;
