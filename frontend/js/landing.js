document.write('<script src="js/config.js"></script>');
document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="css/billing-status.css">');
document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="css/landing-upload.css">');
const form = document.querySelector('#generate-form');
const message = document.querySelector('#generate-message');
const api = window.TORKS_API_URL || 'http://localhost:3000/api';
const plansGrid = document.querySelector('#plans-grid');
const plansMessage = document.querySelector('#plans-message');
const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
let landingMedia=null;
const promptTextarea=document.querySelector('#video-prompt');
promptTextarea.insertAdjacentHTML('afterend','<div class="landing-media-drop" id="landing-media-drop" tabindex="0" role="button"><input id="landing-media-input" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" hidden><div id="landing-media-empty"><span>＋</span><b>Arraste uma imagem ou vídeo aqui</b><small>ou clique para pesquisar no computador · até 100 MB</small></div><div id="landing-media-preview" class="landing-media-preview" hidden></div></div>');
const mediaDrop=document.querySelector('#landing-media-drop'),mediaInput=document.querySelector('#landing-media-input');
function clearLandingMedia(){landingMedia=null;mediaInput.value='';document.querySelector('#landing-media-empty').hidden=false;document.querySelector('#landing-media-preview').hidden=true;document.querySelector('#landing-media-preview').innerHTML='';window.TorksMedia.clear().catch(()=>{});}
async function chooseLandingMedia(file){if(!file)return;const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];if(!allowed.includes(file.type))return alert('Use JPG, PNG, WebP, MP4, WebM ou MOV.');if(file.size>100*1024*1024)return alert('O arquivo deve ter no máximo 100 MB.');landingMedia=file;await window.TorksMedia.save(file);const url=URL.createObjectURL(file),visual=file.type.startsWith('video/')?`<video src="${url}" muted></video>`:`<img src="${url}" alt="Prévia">`;document.querySelector('#landing-media-empty').hidden=true;const preview=document.querySelector('#landing-media-preview');preview.hidden=false;preview.innerHTML=`${visual}<div><b>${escapeHtml(file.name)}</b><small>${file.type.startsWith('video/')?'Vídeo':'Imagem'} pronto para continuar</small></div><button type="button" id="clear-landing-media">Remover</button>`;document.querySelector('#clear-landing-media').onclick=e=>{e.stopPropagation();clearLandingMedia();};}
mediaDrop.onclick=e=>{if(!e.target.closest('#clear-landing-media'))mediaInput.click();};mediaDrop.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();mediaInput.click();}};mediaInput.onchange=()=>chooseLandingMedia(mediaInput.files[0]);['dragenter','dragover'].forEach(name=>mediaDrop.addEventListener(name,e=>{e.preventDefault();mediaDrop.classList.add('dragging');}));['dragleave','drop'].forEach(name=>mediaDrop.addEventListener(name,e=>{e.preventDefault();mediaDrop.classList.remove('dragging');}));mediaDrop.addEventListener('drop',e=>chooseLandingMedia(e.dataTransfer.files[0]));

async function loadPlans() {
  try {
    const response = await fetch(`${api}/billing/plans`);
    const body = await response.json();
    if (!response.ok) throw Error(body.error || 'Não foi possível carregar os planos.');
    const { plans, configured } = body.data;
    plansMessage.textContent = configured ? 'Escolha um plano e continue com segurança pelo Mercado Pago.' : 'Escolha seu plano. O pagamento será liberado assim que o Mercado Pago for configurado.';
    plansGrid.innerHTML = plans.map((plan, index) => `<article class="${index === 1 ? 'featured' : ''}">${index === 1 ? '<span class="popular">MAIS POPULAR</span>' : ''}<h3>${escapeHtml(plan.name.toUpperCase())}</h3><b><strong>${money(plan.priceCents)}</strong><small>/mês</small></b><p>Para criar vídeos com IA de forma rápida e profissional.</p><ul><li>${plan.credits} minutos de geração</li><li>Vídeos verticais em MP4</li><li>Narração e legendas automáticas</li></ul><button class="${index === 1 ? 'teal-button' : 'outline-button'} choose-plan" type="button" data-plan="${plan.id}">Escolher ${escapeHtml(plan.name)}</button></article>`).join('');
    document.querySelectorAll('.choose-plan').forEach(button => button.onclick = () => {
      localStorage.setItem('torksSelectedPlan', button.dataset.plan);
      const destination = localStorage.getItem('torksToken') ? 'conta.html' : 'cadastro.html';
      location.href = `${destination}?plano=${encodeURIComponent(button.dataset.plan)}`;
    });
  } catch (error) {
    plansMessage.textContent = error.message;
    plansGrid.innerHTML = '<article><h3>PLANOS INDISPONÍVEIS</h3><p>Tente novamente em alguns instantes.</p></article>';
  }
}
form?.addEventListener('submit', event => {
  event.preventDefault();
  const prompt = document.querySelector('#video-prompt').value.trim();
  if (!prompt) return;
  localStorage.setItem('torksPendingVideoPrompt', prompt);
  message.textContent = 'Ideia salva. Abrindo a próxima etapa...';
  location.href = localStorage.getItem('torksToken') ? 'criar.html' : 'cadastro.html?origem=gerar-video';
});
loadPlans();
