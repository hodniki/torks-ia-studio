document.write('<script src="js/config.js"></script>');
document.write('<script src="js/navigation.js"></script>');
document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="css/navigation.css">');
document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="css/upload-video.css">');
const publicationsLink=[...document.querySelectorAll('.dash nav a')].find(link=>['Agendamentos','Publicações'].includes(link.textContent.trim()));if(publicationsLink){publicationsLink.href='schedules.html';publicationsLink.textContent='Publicações'}
const api = window.TORKS_API_URL || 'http://localhost:3000/api';
const token = localStorage.getItem('torksToken');
if (!token) location.href = 'login.html';
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
let selectedMedia = null;
const pendingPrompt = localStorage.getItem('torksPendingVideoPrompt');
if (pendingPrompt) document.querySelector('#ai-prompt').value = pendingPrompt;

async function apiFetch(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${api}${path}`, { ...options, headers: { ...(!isForm && { 'Content-Type': 'application/json' }), Authorization: `Bearer ${token}`, ...options.headers } });
  const body = await response.json();
  if (response.status === 401) { localStorage.removeItem('torksToken'); location.href = 'login.html'; }
  if (!response.ok) throw Error(body.error || 'Não foi possível concluir a operação.');
  return body.data;
}

const sourceCopy = {
  theme: ['Descreva o tema', 'Ex.: 5 dicas para pequenos negócios venderem mais pelo Instagram', 'Explique a ideia, o público e o objetivo do vídeo.'],
  product: ['Descreva o produto', 'Ex.: Garrafa térmica de 1 litro, mantém a temperatura por 12 horas', 'Inclua benefícios, público, diferenciais e chamada para ação.'],
  link: ['Cole o link', 'https://www.instagram.com/reel/...', 'Aceitamos links públicos do TikTok, Instagram e YouTube.'],
};
document.querySelectorAll('[name="sourceType"]').forEach(input => input.onchange = () => { const [label, placeholder, help] = sourceCopy[input.value]; document.querySelector('#prompt-label').childNodes[0].textContent = label; document.querySelector('#ai-prompt').placeholder = placeholder; document.querySelector('#prompt-help').textContent = help; });

const drop = document.querySelector('#image-drop');
const input = document.querySelector('#reference-image');
input.accept='image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';
document.querySelector('.reference-field legend').innerHTML='2. Imagem ou vídeo de referência <small>(opcional)</small>';
document.querySelector('#drop-empty').innerHTML='<span>＋</span><b>Arraste uma imagem ou vídeo para cá</b><p>ou clique para pesquisar · JPG, PNG, WebP, MP4, WebM ou MOV · até 100 MB</p>';
document.querySelector('#preview-img').insertAdjacentHTML('afterend','<video id="preview-video" muted controls hidden></video>');
function clearImage() { selectedMedia = null; input.value = ''; document.querySelector('#drop-empty').hidden = false; document.querySelector('#image-preview').hidden = true; document.querySelector('#preview-img').src = ''; document.querySelector('#preview-video').src=''; window.TorksMedia.clear().catch(()=>{}); }
function selectImage(file) {
  if (!file) return;
  if (!['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].includes(file.type)) return alert('Envie JPG, PNG, WebP, MP4, WebM ou MOV.');
  if (file.size > 100 * 1024 * 1024) return alert('O arquivo deve ter no máximo 100 MB.');
  selectedMedia=file;const isVideo=file.type.startsWith('video/'),url=URL.createObjectURL(file),image=document.querySelector('#preview-img'),video=document.querySelector('#preview-video');image.hidden=isVideo;video.hidden=!isVideo;if(isVideo)video.src=url;else image.src=url;document.querySelector('#drop-empty').hidden=false;document.querySelector('#drop-empty').hidden=true;document.querySelector('#image-preview').hidden=false;document.querySelector('#preview-name').textContent=file.name;document.querySelector('#image-preview p').textContent=isVideo?'Este vídeo será usado como mídia de abertura e referência.':'Esta foto guiará a criação visual da arte.';
}
drop.onclick = event => { if (!event.target.closest('#remove-image')) input.click(); };
drop.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') input.click(); };
input.onchange = () => selectImage(input.files[0]);
['dragenter', 'dragover'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('dragging'); }));
drop.addEventListener('drop', event => selectImage(event.dataTransfer.files[0]));
document.querySelector('#remove-image').onclick = event => { event.stopPropagation(); clearImage(); };
(async()=>{try{const pending=await window.TorksMedia.load();if(pending?.blob)selectImage(new File([pending.blob],pending.name,{type:pending.type,lastModified:pending.lastModified}));}catch{}})();

function renderResult(video) {
  const { script, platform, duration, referenceImageUrl } = video.metadata;
  const scenes = script.scenes.map(scene => `<div class="scene"><time>${escapeHtml(scene.time)}</time><div><b>${escapeHtml(scene.visual)}</b><p>${escapeHtml(scene.narration)}</p></div></div>`).join('');
  const production = Object.entries(script.production).map(([key, value]) => `<div><small>${escapeHtml(key.toUpperCase())}</small><b>${escapeHtml(value)}</b></div>`).join('');
  const isReferenceVideo=referenceImageUrl&&/\.(mp4|webm|mov)(?:\?|$)/i.test(referenceImageUrl);const reference = referenceImageUrl ? `<div class="reference-result">${isReferenceVideo?`<video src="${escapeHtml(referenceImageUrl)}" muted controls></video>`:`<img src="${escapeHtml(referenceImageUrl)}" alt="Foto de referência">`}<div><small>MÍDIA DE REFERÊNCIA</small><b>${isReferenceVideo?'Vídeo usado na abertura':'Foto associada à criação da arte'}</b></div></div>` : '';
  document.querySelector('#result-panel').innerHTML = `<div class="result-head"><div><p>ROTEIRO GERADO</p><h2>${escapeHtml(script.title)}</h2><p>${escapeHtml(platform)} · ${duration}s · Vertical 9:16</p></div><span class="result-badge">Salvo em Meus vídeos</span></div>${reference}<div class="script-section"><h3>Gancho</h3><div class="hook">${escapeHtml(script.hook)}</div><h3>Cenas e narração</h3>${scenes}<h3>Pacote de produção</h3><div class="production-grid">${production}</div><h3>Legenda da postagem</h3><div class="hook">${escapeHtml(script.caption).replace(/\n/g, '<br>')}</div><div class="result-actions"><button class="button" id="render-video" type="button">Gerar vídeo completo em MP4</button><a class="secondary-button" href="videos.html">Ver em Meus vídeos</a></div><p class="generate-status" id="render-status"></p></div>`;
  document.querySelector('#render-video').onclick = event => renderVideo(video.id, event.currentTarget);
}

async function renderVideo(id, button) {
  const status = document.querySelector('#render-status');
  button.disabled = true;
  button.textContent = 'Montando vídeo...';
  status.textContent = 'Gerando narração, mídia, legendas e MP4. Isso pode levar alguns minutos.';
  try {
    const result = await apiFetch(`/videos/${id}/render`, { method: 'POST', body: '{}' });
    status.innerHTML = `Vídeo concluído. <a href="${escapeHtml(result.fileUrl)}" target="_blank" rel="noopener">Assistir e baixar MP4</a>`;
    button.textContent = 'MP4 pronto';
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
    button.textContent = 'Tentar gerar MP4 novamente';
  }
}

(async () => { try { const user = await apiFetch('/users/me'); document.querySelector('.user').innerHTML = `<span><b>${escapeHtml(user.name)}</b><small>${escapeHtml(user.email)}</small></span>`; } catch {} })();
document.querySelector('#ai-form').onsubmit = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = event.submitter;
  const status = document.querySelector('#generate-status');
  button.disabled = true;
  try {
    let referenceImageUrl = '';
    if (selectedMedia) { button.textContent = 'Enviando arquivo...'; status.textContent = 'Preparando a mídia de referência.'; const upload = new FormData(); upload.append('media', selectedMedia); referenceImageUrl = (await apiFetch('/videos/reference-media', { method: 'POST', body: upload })).url; }
    button.textContent = 'Gerando roteiro...'; status.textContent = 'A IA está organizando as cenas e a narração.';
    // `event.currentTarget` is cleared by the browser after the first await.
    // Keep the form reference so image uploads can finish before reading its fields.
    const data = Object.fromEntries(new FormData(form)); data.referenceImageUrl = referenceImageUrl;
    const result = await apiFetch('/videos/generate', { method: 'POST', body: JSON.stringify(data) });
    localStorage.removeItem('torksPendingVideoPrompt');
    await window.TorksMedia.clear().catch(()=>{});
    renderResult(result.video); status.textContent = 'Roteiro e referência visual salvos com sucesso.';
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; button.textContent = '✦ Gerar roteiro com IA'; }
};
