require('dotenv').config();
const db = require('../src/config/database');

const api = `http://localhost:${process.env.PORT || 3000}/api`;
const email = `teste-${Date.now()}@torks.local`;
const password = 'TesteSeguro123!';
const phone = `119${String(Date.now()).slice(-8)}`;
const cpf = '52998224725';
let token;

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body?.error || ''}`);
  return body;
}

(async () => {
  const health = await request('/health');
  await db.query('DELETE FROM users WHERE cpf=$1',[cpf]);
  const registered = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Teste Torks', phone, cpf, email, password }) });
  const verificationToken = new URL(registered.data.verificationUrl).searchParams.get('token');
  let blocked = false;
  try { await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); } catch (error) { blocked = error.message.includes('403'); }
  if (!blocked) throw new Error('O login deveria estar bloqueado antes da confirmação do e-mail.');
  await request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: verificationToken }) });
  const logged = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  token = logged.data.token;
  await request('/users/me');
  const account = await request('/users/account');
  if (typeof account.data.creditsRemaining !== 'number') throw new Error('A Central do Assinante não retornou os créditos.');
  const changedPassword = `${password}Nova`;
  await request('/users/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword: password, newPassword: changedPassword }) });
  token = (await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: changedPassword }) })).data.token;
  const created = await request('/projects', { method: 'POST', body: JSON.stringify({ title: 'Projeto de teste', type: 'Texto para vídeo' }) });
  const projects = await request('/projects');
  await request(`/projects/${created.data.id}/secure-delete`, { method: 'POST', body: JSON.stringify({ password: changedPassword }) });
  const generated = await request('/videos/generate', { method: 'POST', body: JSON.stringify({ prompt: 'Crie um vídeo de apresentação do Torks Studio para redes sociais.' }) });
  if (!generated.data.video?.id) throw new Error('A geração não retornou o registro do vídeo.');
  const videos = await request('/videos');
  if (!videos.data.some(video => video.id === generated.data.video.id)) throw new Error('O vídeo criado não apareceu em Meus vídeos.');
  const templates = await request('/templates');
  if (templates.data.length < 1) throw new Error('O catálogo de templates está vazio.');
  const socialAccount = await request('/social-accounts', { method: 'POST', body: JSON.stringify({ platform: 'Instagram', accountName: `teste-${Date.now()}` }) });
  await db.query("UPDATE social_accounts SET status='connected',provider_account_id='teste',token_expires_at=NOW()+INTERVAL '1 hour' WHERE id=$1",[socialAccount.data.id]);
  await db.query("UPDATE videos SET status='ready',file_url='/uploads/renders/teste.mp4' WHERE id=$1",[generated.data.video.id]);
  const schedule = await request('/schedules', { method: 'POST', body: JSON.stringify({ title: 'Publicação de teste', socialAccountId: socialAccount.data.id, videoId: generated.data.video.id, caption: 'Teste', scheduledAt: new Date(Date.now() + 86400000).toISOString(), consent: true }) });
  const schedules = await request('/schedules');
  if (!schedules.data.some(item => item.id === schedule.data.id)) throw new Error('Agendamento não foi listado.');
  await request(`/schedules/${schedule.data.id}`, { method: 'DELETE' });
  console.log(`API saudável (${health.database}); cadastro, projetos, vídeos, templates e agendamentos aprovados.`);
})().catch(error => {
  console.error(`Teste da API falhou: ${error.message}`);
  process.exitCode = 1;
}).finally(async () => {
  await db.query('DELETE FROM users WHERE email = $1', [email]).catch(() => {});
  await db.close();
});
