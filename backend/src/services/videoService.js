const Video = require('../models/Video');
const ApiError = require('../utils/ApiError');

const allowedSources = ['theme', 'product', 'link'];
const allowedPlatforms = ['TikTok', 'Instagram Reels', 'YouTube Shorts'];
const allowedTones = ['Energético', 'Profissional', 'Emocional', 'Educativo', 'Divertido'];

function validate(data) {
  const sourceType = String(data.sourceType || 'theme');
  const prompt = String(data.prompt || '').trim();
  const platform = String(data.platform || 'Instagram Reels');
  const tone = String(data.tone || 'Energético');
  const duration = Number(data.duration || 30);
  const referenceImageUrl = String(data.referenceImageUrl || '').trim();
  if (!allowedSources.includes(sourceType)) throw new ApiError(422, 'Tipo de conteúdo inválido.');
  if (prompt.length < 10 || prompt.length > 5000) throw new ApiError(422, 'A descrição deve ter entre 10 e 5.000 caracteres.');
  if (sourceType === 'link') {
    let url;
    try { url = new URL(prompt); } catch { throw new ApiError(422, 'Informe um link válido.'); }
    const host = url.hostname.replace(/^www\./, '');
    if (!['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be'].some(domain => host === domain || host.endsWith(`.${domain}`))) throw new ApiError(422, 'Use um link do TikTok, Instagram ou YouTube.');
  }
  if (!allowedPlatforms.includes(platform)) throw new ApiError(422, 'Plataforma inválida.');
  if (!allowedTones.includes(tone)) throw new ApiError(422, 'Tom inválido.');
  if (![15, 30, 45, 60].includes(duration)) throw new ApiError(422, 'Duração inválida.');
  if (referenceImageUrl && (!/^https?:\/\//.test(referenceImageUrl) || referenceImageUrl.length > 2048)) throw new ApiError(422, 'Referência visual inválida.');
  return { sourceType, prompt, platform, tone, duration, referenceImageUrl: referenceImageUrl || null };
}

function buildScript({ prompt, sourceType, platform, tone, duration }) {
  const subject = sourceType === 'link' ? 'o conteúdo do link informado' : prompt;
  const segment = Math.max(3, Math.round(duration / 5));
  return {
    title: sourceType === 'product' ? `Conheça: ${prompt.slice(0, 55)}` : prompt.slice(0, 64),
    hook: `Pare de rolar: você precisa conhecer ${subject}.`,
    scenes: [
      { time: `0–${segment}s`, visual: 'Abertura dinâmica em close, texto grande na tela', narration: `Pare de rolar: isso pode mudar a forma como você vê ${subject}.` },
      { time: `${segment}–${segment * 2}s`, visual: 'Apresentação com cortes rápidos', narration: 'Em poucos segundos, veja por que esse assunto está chamando atenção.' },
      { time: `${segment * 2}–${segment * 3}s`, visual: 'Demonstração do principal benefício', narration: 'O principal benefício é simples: uma solução clara, rápida e feita para o seu dia a dia.' },
      { time: `${segment * 3}–${segment * 4}s`, visual: 'Detalhes, prova visual e legendas destacadas', narration: 'Com uma apresentação objetiva, fica fácil entender o valor e tomar uma decisão.' },
      { time: `${segment * 4}–${duration}s`, visual: 'Tela final com chamada para ação', narration: 'Gostou? Salve este vídeo, compartilhe e saiba mais agora.' },
    ],
    caption: `${prompt.slice(0, 180)}\n\n#TorksClips #${platform.replace(/\s+/g, '')} #ConteudoComIA`,
    production: { format: '9:16', platform, tone, voice: 'Português brasileiro natural', captions: 'Animadas', music: 'Automática', transitions: 'Dinâmicas' },
  };
}

exports.generateDraft = async (userId, rawData) => {
  const data = validate(rawData);
  return Video.createDraftFromPrompt(userId, { ...data, script: buildScript(data) });
};
