document.write('<script src="js/config.js"></script>');
document.write('<script src="js/navigation.js"></script>');
document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="css/navigation.css">');

const api = window.TORKS_API_URL || 'http://localhost:3000/api';
const token = localStorage.getItem('torksToken');
if (!token) location.href = 'login.html';

async function req(path, options = {}) {
  const response = await fetch(`${api}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
  const body = await response.json();
  if (response.status === 403) { location.href = 'dashboard.html'; throw Error('Acesso Master necessário.'); }
  if (!response.ok) throw Error(body.error || 'Não foi possível consultar o Mercado Pago.');
  return body.data;
}

const label = {
  MERCADO_PAGO_ACCESS_TOKEN: 'Access Token privado da aplicação',
  MERCADO_PAGO_PUBLIC_KEY: 'Public Key da aplicação',
  MERCADO_PAGO_WEBHOOK_SECRET: 'Assinatura secreta para tópicos compatíveis (recomendada)',
  FRONTEND_URL: 'URL pública do site',
  PUBLIC_API_URL: 'URL pública da API',
};

function item(key, ready, detail = '', optional = false) {
  return `<div class="config-item ${ready ? 'ready' : 'missing'}"><span>${ready ? '✓' : optional ? '○' : '!'}</span><div><b>${key}</b><small>${label[key]}${detail ? ` · ${detail}` : ''}</small></div><em>${ready ? 'Configurado' : optional ? 'Recomendado' : 'Pendente'}</em></div>`;
}

async function load() {
  const status = await req('/admin/payment-configuration');
  const working = status.configured && status.publicKey && status.httpsReady;
  document.querySelector('#status-light').className = `status-light ${working ? 'working' : status.configured ? 'warning' : 'error'}`;
  document.querySelector('#status-title').textContent = working ? 'Configuração pronta para teste' : status.configured ? 'Configuração incompleta' : 'Mercado Pago não configurado';
  document.querySelector('#status-message').textContent = working ? 'Clique em Testar conexão para validar o Access Token.' : 'Complete os itens pendentes no ambiente da API.';
  document.querySelector('#environment').textContent = status.environment === 'production' ? 'PRODUÇÃO' : status.environment === 'test' ? 'TESTE' : 'NÃO CONFIGURADO';
  document.querySelector('#config-list').innerHTML = item('MERCADO_PAGO_ACCESS_TOKEN', status.accessToken, status.environment) + item('MERCADO_PAGO_PUBLIC_KEY', status.publicKey) + item('MERCADO_PAGO_WEBHOOK_SECRET', status.webhookSecret, '', true) + item('FRONTEND_URL', Boolean(status.frontendUrl), status.frontendUrl) + item('PUBLIC_API_URL', Boolean(status.publicApiUrl), status.publicApiUrl);
  document.querySelector('#webhook-url').textContent = status.webhookUrl || 'Configure PUBLIC_API_URL';
  document.querySelector('#https-check').className = status.httpsReady ? 'ok' : 'warning';
}

document.querySelector('#test-connection').onclick = async event => {
  const button = event.currentTarget;
  const message = document.querySelector('#page-message');
  button.disabled = true; button.textContent = 'Testando...'; message.textContent = '';
  try {
    const result = await req('/admin/payment-configuration/test', { method: 'POST', body: '{}' });
    document.querySelector('#status-light').className = 'status-light working';
    document.querySelector('#status-title').textContent = 'Mercado Pago conectado';
    document.querySelector('#status-message').textContent = `Conta ${result.nickname || result.accountId} validada (${result.siteId || 'Brasil'}).`;
    message.textContent = 'Conexão aprovada. O Access Token respondeu corretamente.';
  } catch (error) {
    document.querySelector('#status-light').className = 'status-light error';
    document.querySelector('#status-title').textContent = 'Falha na conexão';
    message.textContent = error.message;
  } finally { button.disabled = false; button.textContent = 'Testar conexão'; }
};

load().catch(error => { document.querySelector('#page-message').textContent = error.message; });
