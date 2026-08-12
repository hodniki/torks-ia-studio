const db = require('../config/database');

const fields = `id, title, type, status, duration_seconds AS "durationSeconds", created_at AS "createdAt", updated_at AS "updatedAt"`;

class Project {
  static async find(userId, id) { const { rows } = await db.query(`SELECT ${fields} FROM projects WHERE user_id=$1 AND id=$2`, [userId, id]); return rows[0] || null; }
  static async list(userId) {
    const { rows } = await db.query(`SELECT ${fields} FROM projects WHERE user_id = $1 ORDER BY updated_at DESC`, [userId]);
    return rows;
  }

  static async create(userId, { title, type }) {
    const id=db.uuid();await db.query(`INSERT INTO projects(id,user_id,title,type)VALUES($1,$2,$3,$4)`,[id,userId,title,type]);return(await db.query(`SELECT ${fields} FROM projects WHERE id=$1`,[id])).rows[0];
  }

  static async remove(userId, id) {
    const { rowCount } = await db.query(`DELETE FROM projects WHERE id=$1 AND user_id=$2 AND status IN ('draft','processing','failed')`, [id, userId]);
    return rowCount > 0;
  }
}

module.exports = Project;
