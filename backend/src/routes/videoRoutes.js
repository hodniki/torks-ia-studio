const router = require('express').Router();
const controller = require('../controllers/videoController');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const referenceUpload = require('../middleware/referenceUpload');
const rateLimit = require('express-rate-limit');
const uploadLimit = rateLimit({ windowMs: 60*60*1000, limit: 30, standardHeaders:'draft-8', legacyHeaders:false, message:{error:'Limite de envios atingido. Tente novamente mais tarde.'} });
const renderLimit = rateLimit({ windowMs: 60*60*1000, limit: 20, standardHeaders:'draft-8', legacyHeaders:false, message:{error:'Limite de renderizações atingido. Tente novamente mais tarde.'} });

router.use(auth);
router.get('/', asyncHandler(controller.list));
router.post('/reference-image', uploadLimit, referenceUpload, asyncHandler(controller.uploadReference));
router.post('/reference-media', uploadLimit, referenceUpload, asyncHandler(controller.uploadReference));
router.post('/generate', asyncHandler(controller.generate));
router.post('/:id/render', renderLimit, asyncHandler(controller.render));

module.exports = router;
