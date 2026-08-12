const bcrypt = require('bcryptjs');
const Project = require('../models/Project');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const validate = require('../utils/validation');

exports.list = async (req, res) => res.json({ data: await Project.list(req.userId) });
exports.create = async (req, res) => res.status(201).json({ data: await Project.create(req.userId, validate.project(req.body)) });
exports.secureRemove = async (req, res) => {
  const password = String(req.body.password || '');
  if (!password) throw new ApiError(422, 'Informe sua senha para confirmar.');
  const project = await Project.find(req.userId, req.params.id);
  if (!project) throw new ApiError(404, 'Projeto não encontrado.');
  if (project.status === 'ready') throw new ApiError(409, 'Projetos concluídos não podem ser excluídos por esta opção.');
  const publicUser = await User.findPublicById(req.userId);
  const user = await User.findByEmail(publicUser.email);
  if (!await bcrypt.compare(password, user.password_hash)) throw new ApiError(403, 'Senha incorreta. O projeto não foi excluído.');
  if (!await Project.remove(req.userId, req.params.id)) throw new ApiError(409, 'Este projeto não pode mais ser excluído.');
  return res.status(204).end();
};
