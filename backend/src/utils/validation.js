const ApiError = require('./ApiError');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = length => { let sum = 0; for (let index = 0; index < length; index++) sum += Number(cpf[index]) * (length + 1 - index); const value = 11 - (sum % 11); return value > 9 ? 0 : value; };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

exports.registration = body => {
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').replace(/\D/g, '');
  const cpf = String(body.cpf || '').replace(/\D/g, '');
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (name.length < 2 || name.length > 120) throw new ApiError(422, 'Nome deve ter entre 2 e 120 caracteres.');
  if (phone.length < 10 || phone.length > 15) throw new ApiError(422, 'Informe um telefone válido com DDD.');
  if (!isValidCpf(cpf)) throw new ApiError(422, 'Informe um CPF válido.');
  if (!emailPattern.test(email) || email.length > 255) throw new ApiError(422, 'Informe um e-mail válido.');
  if (password.length < 8 || password.length > 128) throw new ApiError(422, 'A senha deve ter entre 8 e 128 caracteres.');
  return { name, phone, cpf, email, password };
};
exports.isValidCpf = isValidCpf;

exports.login = body => {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!emailPattern.test(email) || !password) throw new ApiError(422, 'Informe e-mail e senha.');
  return { email, password };
};

exports.project = body => {
  const title = String(body.title || '').trim();
  const type = String(body.type || 'Texto para vídeo').trim();
  if (!title || title.length > 180) throw new ApiError(422, 'Título deve ter entre 1 e 180 caracteres.');
  if (!type || type.length > 60) throw new ApiError(422, 'Tipo de projeto inválido.');
  return { title, type };
};
