const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');
const Video = require('../models/Video');
const User = require('../models/User');

const uploadsRoot = path.join(__dirname, '../../uploads');
const jobsRoot = path.join(uploadsRoot, 'jobs');
const rendersRoot = path.join(uploadsRoot, 'renders');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let errorText = '';
    child.stderr.on('data', chunk => { errorText += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(errorText.slice(-2000) || `Processo encerrou com código ${code}.`)));
  });
}

const timecode = seconds => new Date(seconds * 1000).toISOString().slice(11, 23).replace('.', ',');
function createSrt(scenes, duration) {
  return scenes.map((scene, index) => {
    const start = index * duration / scenes.length;
    const end = (index + 1) * duration / scenes.length - 0.05;
    return `${index + 1}\n${timecode(start)} --> ${timecode(end)}\n${scene.narration}\n`;
  }).join('\n');
}
function localReference(url) {
  if (!url) return null;
  try { const name = path.basename(new URL(url).pathname); return path.join(uploadsRoot, name); } catch { return null; }
}
function subtitlePath(file) { return file.replaceAll('\\', '/').replace(/^([A-Za-z]):/, '$1\\:'); }

async function synthesizeNarration(text, textFile, audioFile) {
  try {
    const { EdgeTTS, Constants } = await import('@andresaya/edge-tts');
    const tts = new EdgeTTS();
    await tts.synthesize(text, 'pt-BR-FranciscaNeural', { rate: '5%', outputFormat: Constants.OUTPUT_FORMAT.RIFF_24KHZ_16BIT_MONO_PCM });
    const neuralAudio = tts.toBuffer();
    // Edge TTS can return a valid WAV header with no audio data when its
    // remote service is unavailable. Treat it as a failed synthesis so the
    // local Windows voice fallback is used instead of passing an empty file
    // to ffmpeg.
    if (!neuralAudio || neuralAudio.length <= 46) throw new Error('A voz neural retornou um áudio vazio.');
    await fs.writeFile(audioFile, neuralAudio);
  } catch (onlineError) {
    try {
      await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '../../scripts/synthesize-speech.ps1'), '-InputFile', textFile, '-OutputFile', audioFile]);
    } catch {
      throw new Error(`Não foi possível gerar a narração. Voz neural: ${onlineError.message}`);
    }
  }
}

exports.render = async (userId, videoId, publicBaseUrl) => {
  const video = await Video.findOwned(userId, videoId);
  if (!video) throw new Error('Vídeo não encontrado.');
  const creditCost = Math.max(1, Math.ceil(Number(video.metadata.duration || video.durationSeconds || 30) / 60));
  if (!await User.reserveCredits(userId, creditCost)) throw new Error('Créditos insuficientes para gerar este vídeo.');
  await Video.setStatus(userId, videoId, 'processing');
  const jobDir = path.join(jobsRoot, videoId);
  const output = path.join(rendersRoot, `${videoId}.mp4`);
  try {
    await fs.mkdir(jobDir, { recursive: true });
    await fs.mkdir(rendersRoot, { recursive: true });
    const narrationFile = path.join(jobDir, 'narration.txt');
    const audioFile = path.join(jobDir, 'narration.wav');
    const subtitleFile = path.join(jobDir, 'captions.srt');
    const scenes = video.metadata.script.scenes;
    const duration = Number(video.metadata.duration || video.durationSeconds || 30);
    const narrationText = scenes.map(scene => scene.narration).join(' ');
    await fs.writeFile(narrationFile, narrationText, 'utf8');
    await fs.writeFile(subtitleFile, `\uFEFF${createSrt(scenes, duration)}`, 'utf8');
    await synthesizeNarration(narrationText, narrationFile, audioFile);
    const reference = localReference(video.metadata.referenceImageUrl);
    const hasReference = reference && await fs.access(reference).then(() => true).catch(() => false);
    const isVideoReference = hasReference && ['.mp4','.webm','.mov'].includes(path.extname(reference).toLowerCase());
    const visualInput = isVideoReference ? ['-stream_loop','-1','-i',reference] : hasReference ? ['-loop','1','-i',reference] : ['-f','lavfi','-i',`color=c=0x10243a:s=720x1280:r=30:d=${duration}`];
    const subtitles = `subtitles='${subtitlePath(subtitleFile)}':force_style='FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=3,Alignment=2,MarginV=110'`;
    const videoFilter = isVideoReference ? `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,eq=brightness=-0.06,${subtitles}[v]` : hasReference ? `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,zoompan=z='min(zoom+0.0008,1.08)':d=${duration*30}:s=720x1280,eq=brightness=-0.08,${subtitles}[v]` : `[0:v]${subtitles}[v]`;
    const filters = `${videoFilter};[1:a]volume=1.0[n];[2:a]volume=0.035[m];[n][m]amix=inputs=2:duration=longest:normalize=0[a]`;
    await run(ffmpeg, ['-y', ...visualInput, '-i', audioFile, '-f', 'lavfi', '-i', `sine=frequency=180:sample_rate=44100:duration=${duration}`, '-filter_complex', filters, '-map', '[v]', '-map', '[a]', '-t', String(duration), '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', output]);
    const fileUrl = `${publicBaseUrl}/uploads/renders/${videoId}.mp4`;
    await Video.completeRender(userId, videoId, fileUrl, duration);
    await fs.rm(jobDir, { recursive: true, force: true });
    return fileUrl;
  } catch (error) {
    await User.refundCredits(userId, creditCost).catch(() => {});
    await Video.failRender(userId, videoId, error.message.slice(0, 500));
    throw error;
  }
};
