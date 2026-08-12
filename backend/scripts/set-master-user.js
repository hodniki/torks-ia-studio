require('dotenv').config();
const db = require('../src/config/database');
const email = String(process.argv[2] || '').trim().toLowerCase();
(async () => {
  const { rows } = await db.query(`UPDATE users SET role='master', updated_at=NOW() WHERE email=$1 RETURNING email, role`, [email]);
  if (!rows.length) { console.error('Conta não encontrada.'); process.exitCode = 2; return; }
  console.log(`Usuário Master configurado: ${rows[0].email}`);
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.close());
