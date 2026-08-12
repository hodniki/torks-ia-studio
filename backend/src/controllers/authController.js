const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const validate = require('../utils/validation');
const emailService = require('../services/emailService');
const AuthorizedDevice = require('../models/AuthorizedDevice');

const createToken = (user, sessionId) => jwt.sign({ sid: sessionId }, process.env.JWT_SECRET, { subject: user.id, expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' });
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

async function issueVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  await User.setVerificationToken(user.id, hashToken(token), new Date(Date.now() + 24 * 60 * 60 * 1000));
  return emailService.sendVerification({ ...user, token });
}

exports.register = async (req, res) => {
  const data = validate.registration(req.body);
  if (await User.findByEmail(data.email)) throw new ApiError(409, 'Este e-mail já está cadastrado.');
  if (await User.findByPhone(data.phone)) throw new ApiError(409, 'Este telefone já está vinculado a uma conta.');
  if (await User.findByCpf(data.cpf)) throw new ApiError(409, 'Este CPF já está vinculado a uma conta.');
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await User.create({ ...data, passwordHash });
  const delivery = await issueVerification(user);
  return res.status(201).json({ data: { message: 'Cadastro realizado. Confirme o e-mail para liberar seu acesso.', email: user.email, ...delivery } });
};

exports.login = async (req, res) => {
  const data = validate.login(req.body);
  const record = await User.findByEmail(data.email);
  if (!record || !(await bcrypt.compare(data.password, record.password_hash))) throw new ApiError(401, 'E-mail ou senha inválidos.');
  if (!record.email_verified_at) throw new ApiError(403, 'Confirme seu e-mail antes de entrar.');
  const user = await User.findPublicById(record.id);
  const device = await AuthorizedDevice.create(user.id, { userAgent: req.get('user-agent'), ipAddress: String(req.ip||'').replace(/^::ffff:/,'') });
  return res.json({ data: { user, token: createToken(user, device.sessionId) } });
};

exports.verifyEmail = async (req, res) => {
  const token = String(req.body.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(422, 'Link de confirmação inválido.');
  const user = await User.verifyEmail(hashToken(token));
  if (!user) throw new ApiError(400, 'O link é inválido, expirou ou já foi utilizado.');
  return res.json({ data: { message: 'E-mail confirmado. Seu acesso está liberado.' } });
};

exports.resendVerification = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findByEmail(email);
  if (user && !user.email_verified_at) await issueVerification(user);
  return res.json({ data: { message: 'Se houver uma conta pendente, enviaremos um novo link.' } });
};

exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findByEmail(email);
  let delivery = {};
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.setPasswordResetToken(user.id, hashToken(token), new Date(Date.now() + 30 * 60 * 1000));
    delivery = await emailService.sendPasswordReset({ ...user, token });
  }
  return res.json({ data: { message: 'Se o e-mail estiver cadastrado, enviaremos um link válido por 30 minutos.', ...delivery } });
};

exports.resetPassword = async (req, res) => {
  const token = String(req.body.token || ''), password = String(req.body.password || '');
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(422, 'Link de redefinição inválido.');
  if (password.length < 8 || password.length > 128 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) throw new ApiError(422, 'Use de 8 a 128 caracteres, com letra maiúscula, minúscula e número.');
  const user = await User.resetPassword(hashToken(token), await bcrypt.hash(password, 12));
  if (!user) throw new ApiError(400, 'O link é inválido, expirou ou já foi utilizado.');
  return res.json({ data: { message: 'Senha redefinida com sucesso. Agora você pode entrar.' } });
};
