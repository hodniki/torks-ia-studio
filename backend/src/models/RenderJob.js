const db = require('../config/database');

class RenderJob {
  static async enqueue(userId, videoId) {
    const existing = await db.query("SELECT id,status FROM render_jobs WHERE video_id=$1 AND status IN('queued','processing') ORDER BY created_at DESC LIMIT 1", [videoId]);
    if (existing.rows[0]) return existing.rows[0];
    const id = db.uuid();
    await db.query("INSERT INTO render_jobs(id,user_id,video_id,status)VALUES($1,$2,$3,'queued')", [id, userId, videoId]);
    await db.query("UPDATE videos SET status='queued' WHERE id=$1", [videoId]);
    return { id, status: 'queued' };
  }
  static async status(userId, videoId) { return (await db.query('SELECT id,status,error_message AS "errorMessage",started_at AS "startedAt",finished_at AS "finishedAt",created_at AS "createdAt" FROM render_jobs WHERE user_id=$1 AND video_id=$2 ORDER BY created_at DESC LIMIT 1', [userId, videoId])).rows[0] || null; }
  static async claim() { return db.withTransaction(async client => { const found = await client.query("SELECT id FROM render_jobs WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED"); if (!found.rows[0]) return null; await client.query("UPDATE render_jobs SET status='processing',started_at=NOW(),attempts=attempts+1 WHERE id=$1", [found.rows[0].id]); return (await client.query('SELECT id,user_id AS "userId",video_id AS "videoId" FROM render_jobs WHERE id=$1', [found.rows[0].id])).rows[0]; }); }
  static async complete(id) { await db.query("UPDATE render_jobs SET status='completed',finished_at=NOW(),error_message=NULL WHERE id=$1", [id]); }
  static async fail(id, error) { await db.query("UPDATE render_jobs SET status='failed',finished_at=NOW(),error_message=$2 WHERE id=$1", [id, String(error).slice(0, 500)]); }
  static async recoverInterrupted() { await db.query("UPDATE render_jobs SET status='queued',started_at=NULL WHERE status='processing'"); }
}
module.exports = RenderJob;
