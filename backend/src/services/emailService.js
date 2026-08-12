const nodemailer = require('nodemailer');
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5500').replace(/\/$/, '');
const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character]));

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
}

async function deliver({ email, subject, text, html, developmentUrl }) {
  const transport = createTransport();
  if (!transport) {
    if (process.env.NODE_ENV === 'production') throw new Error('O envio de e-mail não foi configurado.');
    console.log(`Link local para ${email}: ${developmentUrl}`);
    return developmentUrl.includes('redefinir') ? { resetUrl: developmentUrl } : { verificationUrl: developmentUrl };
  }
  await transport.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to: email, subject, text, html });
  return {};
}

exports.sendVerification = ({ name, email, token }) => {
  const url = `${frontendUrl}/confirmar-email.html?token=${encodeURIComponent(token)}`;
  return deliver({ email, developmentUrl: url, subject: 'Confirme seu e-mail — Torks Studio', text: `Olá, ${name}. Confirme seu e-mail: ${url}\n\nO link expira em 24 horas.`, html: `<p>Olá, ${escapeHtml(name)}.</p><p><a href="${escapeHtml(url)}">Confirmar meu e-mail</a></p><p>O link expira em 24 horas.</p>` });
};

exports.sendPasswordReset = ({ name, email, token }) => {
  const url = `${frontendUrl}/redefinir-senha.html?token=${encodeURIComponent(token)}`;
  return deliver({ email, developmentUrl: url, subject: 'Redefinição de senha — Torks Studio', text: `Olá, ${name}. Redefina sua senha: ${url}\n\nO link expira em 30 minutos.`, html: `<p>Olá, ${escapeHtml(name)}.</p><p><a href="${escapeHtml(url)}">Criar nova senha</a></p><p>O link expira em 30 minutos. Se você não solicitou, ignore esta mensagem.</p>` });
};

exports.verifyConnection = async () => { const transport = createTransport(); if (!transport) throw new Error('SMTP não configurado.'); await transport.verify(); return 'Conexão SMTP aprovada'; };
