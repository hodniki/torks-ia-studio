document.write('<script src="js/config.js"></script>');
const form = document.querySelector('form');
const message = document.querySelector('.message');
const api = window.TORKS_API_URL || 'http://localhost:3000/api';
const selectedPlan = new URLSearchParams(location.search).get('plano');
if (selectedPlan) localStorage.setItem('torksSelectedPlan', selectedPlan);

form?.addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const isRegister = form.id === 'register-form';
  const endpoint = isRegister ? 'register' : 'login';
  message.textContent = 'Aguarde...';
  try {
    const response = await fetch(`${api}/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) throw Error(body.error);
    if (isRegister) {
      form.hidden = true;
      message.innerHTML = `${body.data.message}${body.data.verificationUrl ? `<br><br><a class="button" href="${body.data.verificationUrl}">Confirmar e-mail (teste local)</a>` : '<br><br>Verifique sua caixa de entrada e também a pasta de spam.'}`;
      return;
    }
    localStorage.setItem('torksUser', JSON.stringify(body.data.user));
    localStorage.setItem('torksToken', body.data.token);
    const pendingPlan = localStorage.getItem('torksSelectedPlan');
    const pendingVideo = localStorage.getItem('torksPendingVideoPrompt');
    location.href = pendingVideo ? 'criar.html' : pendingPlan ? `conta.html?plano=${encodeURIComponent(pendingPlan)}` : 'dashboard.html';
  } catch (error) {
    message.textContent = error.message || 'Não foi possível conectar à API.';
  }
});
