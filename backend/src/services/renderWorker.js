const RenderJob = require('../models/RenderJob');
const renderService = require('./renderService');
let running = false;

async function process() {
  if (running) return;
  running = true;
  try {
    const job = await RenderJob.claim();
    if (!job) return;
    try {
      const base = String(process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
      await renderService.render(job.userId, job.videoId, base);
      await RenderJob.complete(job.id);
    } catch (error) {
      await RenderJob.fail(job.id, error.message);
    }
  } catch (error) { console.error('Fila de renderização:', error.message); }
  finally { running = false; }
}

exports.schedule = async () => { await RenderJob.recoverInterrupted(); const timer = setInterval(process, 3000); timer.unref(); setTimeout(process, 500).unref(); return timer; };
exports.process = process;
