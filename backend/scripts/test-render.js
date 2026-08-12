require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('../src/config/database');
const videoService = require('../src/services/videoService');
const renderService = require('../src/services/renderService');

(async () => {
  const { rows } = await db.query('SELECT id FROM users WHERE email_verified_at IS NOT NULL ORDER BY created_at LIMIT 1');
  if (!rows.length) throw new Error('Nenhum usuário verificado disponível para o teste.');
  const userId = rows[0].id;
  const initialCredits = Number((await db.query('SELECT credits_remaining FROM users WHERE id=$1',[userId])).rows[0].credits_remaining);
  const { project, video } = await videoService.generateDraft(userId, { sourceType: 'theme', prompt: 'Teste de criação de vídeo vertical completo para o Torks Studio', platform: 'Instagram Reels', tone: 'Energético', duration: 15 });
  try {
    const fileUrl = await renderService.render(userId, video.id, 'http://localhost:3000');
    const file = path.join(__dirname, '../uploads/renders', `${video.id}.mp4`);
    const info = await fs.stat(file);
    if (info.size < 10000) throw new Error('O arquivo MP4 gerado está vazio.');
    console.log(`Renderização aprovada: ${fileUrl} (${Math.round(info.size / 1024)} KB)`);
    await fs.rm(file, { force: true });
  } finally {
    await db.query('UPDATE users SET credits_remaining=$2 WHERE id=$1', [userId, initialCredits]);
    await db.query("DELETE FROM credit_transactions WHERE user_id=$1 AND description IN ('Geração de vídeo','Estorno por falha na geração') AND created_at>NOW()-INTERVAL '30 minutes'",[userId]);
    await db.query('DELETE FROM projects WHERE id=$1', [project.id]);
  }
})().catch(error => { console.error(`Teste de renderização falhou: ${error.message}`); process.exitCode = 1; }).finally(() => db.close());
