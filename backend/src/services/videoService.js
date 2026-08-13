const Video = require('../models/Video');
const ApiError = require('../utils/ApiError');
const gemini = require('./geminiService');

const allowedSources = ['theme', 'product', 'link'];
const allowedPlatforms = ['TikTok', 'Instagram Reels', 'YouTube Shorts'];
const allowedTones = ['Energético', 'Profissional', 'Emocional', 'Educativo', 'Divertido'];

function validate(data) {
  const sourceType = String(data.sourceType || 'theme'), prompt = String(data.prompt || '').trim(), platform = String(data.platform || 'Instagram Reels'), tone = String(data.tone || 'Energético'), duration = Number(data.duration || 30), referenceImageUrl = String(data.referenceImageUrl || '').trim();
  if (!allowedSources.includes(sourceType)) throw new ApiError(422, 'Tipo de conteúdo inválido.');
  if (prompt.length < 10 || prompt.length > 5000) throw new ApiError(422, 'A descrição deve ter entre 10 e 5.000 caracteres.');
  if (sourceType === 'link') { let url; try { url = new URL(prompt); } catch { throw new ApiError(422, 'Informe um link válido.'); } const host = url.hostname.replace(/^www\./, ''); if (!['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be'].some(domain => host === domain || host.endsWith(`.${domain}`))) throw new ApiError(422, 'Use um link do TikTok, Instagram ou YouTube.'); }
  if (!allowedPlatforms.includes(platform)) throw new ApiError(422, 'Plataforma inválida.');
  if (!allowedTones.includes(tone)) throw new ApiError(422, 'Tom inválido.');
  if (![15, 30, 45, 60].includes(duration)) throw new ApiError(422, 'Duração inválida.');
  if (referenceImageUrl && (!/^https?:\/\//.test(referenceImageUrl) || referenceImageUrl.length > 2048)) throw new ApiError(422, 'Referência visual inválida.');
  return { sourceType, prompt, platform, tone, duration, referenceImageUrl: referenceImageUrl || null };
}

function finishScript(generated, { platform, tone, duration }) { const segment = duration / 5; return { title: String(generated.title).slice(0, 180), hook: String(generated.hook).slice(0, 500), scenes: generated.scenes.map((scene, index) => ({ time: `${Math.round(index * segment)}–${Math.round((index + 1) * segment)}s`, visual: String(scene.visual).slice(0, 500), narration: String(scene.narration).slice(0, 800) })), caption: String(generated.caption).slice(0, 2200), production: { format: '9:16', platform, tone, voice: 'Português brasileiro natural', captions: 'Animadas', music: 'Trilha ambiente', transitions: 'Dinâmicas' } }; }

exports.generateDraft = async (userId, rawData) => { const data = validate(rawData); const generated = await gemini.createVideoScript(data); return Video.createDraftFromPrompt(userId, { ...data, script: finishScript(generated, data), aiProvider: 'gemini' }); };
