const Template = require('../models/Template');
exports.list = async (_req, res) => res.json({ data: await Template.list() });
