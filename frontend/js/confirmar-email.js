const api = window.TORKS_API_URL || 'http://localhost:3000/api';
const title = document.querySelector('#verification-title');
const message = document.querySelector('#verification-message');
const loginLink = document.querySelector('#login-link');
const token = new URLSearchParams(location.search).get('token');

(async () => {
  if (!token) { title.textContent = 'Link inválido'; message.textContent = 'O código de confirmação não foi informado.'; return; }
  try {
    const response = await fetch(`${api}/auth/verify-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const body = await response.json();
    if (!response.ok) throw Error(body.error);
    title.textContent = 'E-mail confirmado!';
    message.textContent = body.data.message;
    loginLink.hidden = false;
  } catch (error) {
    title.textContent = 'Não foi possível confirmar';
    message.textContent = error.message || 'Tente solicitar um novo link.';
  }
})();
