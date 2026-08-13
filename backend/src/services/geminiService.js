const ApiError = require('../utils/ApiError');

const schema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    hook: { type: 'STRING' },
    scenes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { visual: { type: 'STRING' }, narration: { type: 'STRING' } }, required: ['visual', 'narration'] } },
    caption: { type: 'STRING' },
  },
  required: ['title', 'hook', 'scenes', 'caption'],
};

function configured() { return Boolean(process.env.GEMINI_API_KEY); }

exports.isConfigured = configured;

exports.createVideoScript = async data => {
  if (!configured()) throw new ApiError(503, 'A IA de roteiro ainda não foi configurada pelo administrador.');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Você é um roteirista brasileiro especializado em vídeos verticais curtos. Responda somente no JSON solicitado, com linguagem natural, afirmações responsáveis e sem inventar dados factuais.' }] },
      contents: [{ role: 'user', parts: [{ text: `Crie um roteiro original em português do Brasil para ${data.platform}, com ${data.duration} segundos, tom ${data.tone}. Origem: ${data.sourceType}. Pedido do usuário: ${data.prompt}. Produza exatamente 5 cenas, com narração que caiba no tempo, indicação visual concreta e uma legenda curta com hashtags relevantes.` }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.8, maxOutputTokens: 1800 },
    }),
    signal: AbortSignal.timeout(45000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(502, body.error?.message || 'A IA não conseguiu gerar o roteiro.');
  const text = body.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
  let result;
  try { result = JSON.parse(text); } catch { throw new ApiError(502, 'A IA retornou um roteiro em formato inválido.'); }
  if (!result.title || !result.hook || !result.caption || !Array.isArray(result.scenes) || result.scenes.length !== 5) throw new ApiError(502, 'A IA retornou um roteiro incompleto.');
  return result;
};
