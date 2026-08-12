require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');

const app = require('./app');
const db = require('./config/database');
const port = Number(process.env.PORT || 3000);
const backupService = require('./services/backupService');
const publicationWorker = require('./services/publicationWorker');
let server;

async function start() {
  try {
    await db.checkConnection();
    await db.initSchema();
    server = app.listen(port, () => {
      console.log(`Torks Studio API disponível em http://localhost:${port}`);
      console.log('MySQL conectado e tabelas verificadas.');
    });
    backupService.schedule();
    publicationWorker.schedule();
  } catch (error) {
    console.error('Falha ao iniciar a API:', error.message);
    await db.close().catch(() => {});
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} recebido. Encerrando...`);
  if (server) server.close(async () => { await db.close(); process.exit(0); });
  else { await db.close(); process.exit(0); }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
start();
