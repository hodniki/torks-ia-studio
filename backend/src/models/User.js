const db = require('../config/database');

class User {
  static async findByEmail(email) {
    const { rows } = await db.query('SELECT id, name, phone, email, password_hash, email_verified_at, created_at FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  }

  static async findByPhone(phone) {
    const { rows } = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    return rows[0] || null;
  }

  static async findByCpf(cpf) { const { rows } = await db.query('SELECT id FROM users WHERE cpf=$1', [cpf]); return rows[0] || null; }

  static async findPublicById(id) {
    const { rows } = await db.query('SELECT id, name, phone, cpf, email, avatar_url AS "avatarUrl", email_verified_at AS "emailVerifiedAt", plan_name AS "planName", credits_remaining AS "creditsRemaining", role, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async create({ name, phone, cpf, email, passwordHash }) {
    const id=db.uuid();await db.query("INSERT INTO users(id,name,phone,cpf,email,password_hash,plan_name,credits_remaining)VALUES($1,$2,$3,$4,$5,$6,'Free',5)",[id,name,phone,cpf,email,passwordHash]);return(await db.query('SELECT id,name,phone,cpf,email,created_at AS "createdAt" FROM users WHERE id=$1',[id])).rows[0];
  }

  static async setVerificationToken(id, tokenHash, expiresAt) {
    await db.query('UPDATE users SET email_verification_token_hash = $2, email_verification_expires_at = $3, updated_at = NOW() WHERE id = $1', [id, tokenHash, expiresAt]);
  }

  static async verifyEmail(tokenHash) {
    const found=await db.query('SELECT id FROM users WHERE email_verification_token_hash=$1 AND email_verification_expires_at>NOW() AND email_verified_at IS NULL',[tokenHash]);
    if(!found.rows[0])return null;await db.query('UPDATE users SET email_verified_at=NOW(),email_verification_token_hash=NULL,email_verification_expires_at=NULL WHERE id=$1',[found.rows[0].id]);return this.findPublicById(found.rows[0].id);
  }

  static async setPasswordResetToken(id, tokenHash, expiresAt) {
    await db.query('UPDATE users SET password_reset_token_hash=$2,password_reset_expires_at=$3,updated_at=NOW() WHERE id=$1', [id, tokenHash, expiresAt]);
  }

  static async resetPassword(tokenHash, passwordHash) {
    const found=await db.query('SELECT id,email FROM users WHERE password_reset_token_hash=$1 AND password_reset_expires_at>NOW()',[tokenHash]);if(!found.rows[0])return null;await db.query('UPDATE users SET password_hash=$2,password_reset_token_hash=NULL,password_reset_expires_at=NULL WHERE id=$1',[found.rows[0].id,passwordHash]);return found.rows[0];
  }

  static async update(id, { name, avatarUrl, cpf }) {
    await db.query(`UPDATE users SET name=COALESCE($2,name),avatar_url=COALESCE($3,avatar_url),cpf=COALESCE($4,cpf) WHERE id=$1`,[id,name||null,avatarUrl||null,cpf||null]);return this.findPublicById(id);
  }

  static async updatePassword(id, passwordHash) { await db.query('UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1', [id, passwordHash]); }
  static async reserveCredits(id, amount) { return db.withTransaction(async client=>{const result=await client.query('UPDATE users SET credits_remaining=credits_remaining-$2 WHERE id=$1 AND credits_remaining >= $2 AND (credits_valid_until IS NULL OR credits_valid_until>NOW())',[id,amount]);if(!result.rowCount)return false;await client.query("INSERT INTO credit_transactions(id,user_id,amount,type,description)VALUES($1,$2,$3,'usage','Geração de vídeo')",[db.uuid(),id,-amount]);return true}); }
  static async refundCredits(id, amount) { await db.withTransaction(async client=>{await client.query('UPDATE users SET credits_remaining=credits_remaining+$2 WHERE id=$1',[id,amount]);await client.query("INSERT INTO credit_transactions(id,user_id,amount,type,description)VALUES($1,$2,$3,'refund','Estorno por falha na geração')",[db.uuid(),id,amount])}); }
  static async accountSummary(id) { const { rows } = await db.query(`SELECT u.id,u.name,u.cpf,u.email,u.email_verified_at AS "emailVerifiedAt",u.plan_name AS "planName",u.credits_remaining AS "creditsRemaining",u.credits_valid_until AS "creditsValidUntil",u.role,u.created_at AS "createdAt",COUNT(DISTINCT p.id) AS "totalProjects",COUNT(DISTINCT CASE WHEN v.status='ready' THEN v.id END) AS "readyVideos",COALESCE(SUM(DISTINCT p.duration_seconds),0) AS "generatedSeconds" FROM users u LEFT JOIN projects p ON p.user_id=u.id LEFT JOIN videos v ON v.project_id=p.id WHERE u.id=$1 GROUP BY u.id`, [id]); return rows[0] || null; }
  static async creditHistory(id){const{rows}=await db.query(`SELECT id,amount,type,description,expires_at AS "expiresAt",created_at AS "createdAt" FROM credit_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[id]);return rows;}
  static async deletionFiles(id){const{rows}=await db.query(`SELECT v.file_url AS "fileUrl",v.thumbnail_url AS "thumbnailUrl" FROM videos v JOIN projects p ON p.id=v.project_id WHERE p.user_id=$1`,[id]);return rows;}
  static async deleteAccount(id){const{rowCount}=await db.query("DELETE FROM users WHERE id=$1 AND role<>'master'",[id]);return rowCount>0;}
  static async exportData(id){const user=await this.findPublicById(id),q=await Promise.all([db.query('SELECT id,title,type,status,duration_seconds AS "durationSeconds",created_at AS "createdAt" FROM projects WHERE user_id=$1',[id]),db.query('SELECT platform,account_name AS "accountName",status,created_at AS "createdAt" FROM social_accounts WHERE user_id=$1',[id]),db.query('SELECT title,platform,caption,scheduled_at AS "scheduledAt",status FROM schedules WHERE user_id=$1',[id]),db.query('SELECT amount_cents AS "amountCents",currency,status,description,paid_at AS "paidAt",created_at AS "createdAt" FROM payments WHERE user_id=$1',[id]),db.query('SELECT amount,type,description,expires_at AS "expiresAt",created_at AS "createdAt" FROM credit_transactions WHERE user_id=$1',[id])]);return{exportedAt:new Date().toISOString(),user,projects:q[0].rows,socialAccounts:q[1].rows,publications:q[2].rows,payments:q[3].rows,credits:q[4].rows}}
}

module.exports = User;
