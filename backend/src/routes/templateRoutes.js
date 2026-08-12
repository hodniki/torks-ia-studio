const router = require('express').Router();
const controller = require('../controllers/templateController');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
router.use(auth);
router.get('/', asyncHandler(controller.list));
module.exports = router;
