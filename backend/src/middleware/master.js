const User = require('../models/User');
const ApiError = require('../utils/ApiError');

module.exports = async (req, _res, next) => {
  try {
    const user = await User.findPublicById(req.userId);
    if (!user || user.role !== 'master') return next(new ApiError(403, 'Acesso exclusivo do usuário Master.'));
    return next();
  } catch (error) { return next(error); }
};
