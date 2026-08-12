const db = require('../config/database');

class Video {
  static async findOwned(userId, id) { const { rows } = await db.query(`SELECT v.id, v.title, v.status, v.file_url AS "fileUrl", v.duration_seconds AS "durationSeconds", v.metadata FROM videos v INNER JOIN projects p ON p.id=v.project_id WHERE v.id=$1 AND p.user_id=$2`, [id, userId]); return rows[0] || null; }
  static async setStatus(userId, id, status) { await db.query(`UPDATE videos SET status=$3 WHERE id=$1 AND project_id IN(SELECT id FROM projects WHERE user_id=$2)`, [id, userId, status]); }
  static async completeRender(userId, id, fileUrl, duration) { await db.query(`UPDATE videos SET status='ready',file_url=$3,duration_seconds=$4,metadata=JSON_SET(metadata,'$.renderError',NULL) WHERE id=$1 AND project_id IN(SELECT id FROM projects WHERE user_id=$2)`, [id,userId,fileUrl,duration]);await db.query(`UPDATE projects SET status='ready',duration_seconds=$2 WHERE id=(SELECT project_id FROM videos WHERE id=$1)`,[id,duration]); }
  static async failRender(userId, id, message) { await db.query(`UPDATE videos SET status='failed',metadata=JSON_SET(metadata,'$.renderError',$3) WHERE id=$1 AND project_id IN(SELECT id FROM projects WHERE user_id=$2)`,[id,userId,message]); }
  static async list(userId) {
    const { rows } = await db.query(`SELECT v.id, v.project_id AS "projectId", v.title, v.file_url AS "fileUrl", v.thumbnail_url AS "thumbnailUrl", v.status, v.duration_seconds AS "durationSeconds", v.metadata, v.created_at AS "createdAt", v.updated_at AS "updatedAt", p.type AS "projectType" FROM videos v INNER JOIN projects p ON p.id = v.project_id WHERE p.user_id = $1 ORDER BY v.updated_at DESC`, [userId]);
    return rows;
  }

  static async createDraftFromPrompt(userId, metadata) {
    const { prompt, script, duration } = metadata;
    const title = script.title || (prompt.length > 58 ? `${prompt.slice(0, 55)}…` : prompt);
    return db.withTransaction(async client => {
      const projectId=db.uuid(),videoId=db.uuid();await client.query(`INSERT INTO projects(id,user_id,title,type,status,duration_seconds)VALUES($1,$2,$3,'Criar com IA','draft',$4)`,[projectId,userId,title,duration]);await client.query(`INSERT INTO videos(id,project_id,title,status,duration_seconds,metadata)VALUES($1,$2,$3,'draft',$4,$5)`,[videoId,projectId,title,duration,JSON.stringify(metadata)]);const project=(await client.query(`SELECT id,title,type,status,duration_seconds AS "durationSeconds",created_at AS "createdAt",updated_at AS "updatedAt" FROM projects WHERE id=$1`,[projectId])).rows[0],video=(await client.query(`SELECT id,project_id AS "projectId",title,status,duration_seconds AS "durationSeconds",metadata,created_at AS "createdAt",updated_at AS "updatedAt" FROM videos WHERE id=$1`,[videoId])).rows[0];return{project,video};
    });
  }
}

module.exports = Video;
