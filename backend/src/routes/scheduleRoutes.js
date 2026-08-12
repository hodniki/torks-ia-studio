const router=require('express').Router(), controller=require('../controllers/scheduleController'), auth=require('../middleware/auth'), asyncHandler=require('../utils/asyncHandler');
router.use(auth); router.get('/',asyncHandler(controller.list)); router.post('/',asyncHandler(controller.create)); router.delete('/:id',asyncHandler(controller.remove)); module.exports=router;
