require('dotenv').config();
const db = require('../src/config/database');

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Informe o e-mail da conta.');
  process.exit(1);
}

(async () => {
  const { rows } = await db.query(
    `UPDATE users
     SET email_verified_at = NOW(), email_verification_token_hash = NULL,
         email_verification_expires_at = NULL, updated_at = NOW()
     WHERE email = $1
     RETURNING email, email_verified_at AS "emailVerifiedAt"`,
    [email]
  );
  if (!rows.length) {
    console.error('Conta não encontrada.');
    process.exitCode = 2;
    return;
  }
  console.log(`E-mail verificado: ${rows[0].email}`);
})().catch(error => {
  console.error(`Não foi possível verificar a conta: ${error.message}`);
  process.exitCode = 1;
}).finally(() => db.close());
