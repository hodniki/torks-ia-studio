require('dotenv').config();
const db = require('../src/config/database');
const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email.endsWith('@torks.local')) { console.error('Somente contas locais de teste podem ser removidas.'); process.exit(1); }
db.query('DELETE FROM users WHERE email=$1', [email])
  .then(result => console.log(`${result.rowCount} conta temporária removida.`))
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => db.close());
