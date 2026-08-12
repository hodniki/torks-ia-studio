(function () {
  const nav = document.querySelector('.dash aside nav');
  if (!nav) return;
  const current = location.pathname.split('/').pop() || 'dashboard.html';
  const items = [
    ['dashboard.html', 'Visão geral'],
    ['criar.html', 'Criar com IA'],
    ['videos.html', 'Meus vídeos'],
    ['templates.html', 'Templates'],
    ['schedules.html', 'Publicações'],
    ['conta.html', 'Minha conta'],
  ];
  try {
    if (JSON.parse(localStorage.getItem('torksUser') || '{}').role === 'master') {
      items.push(['admin.html', 'Administrativo'], ['clientes.html', 'Clientes'], ['financeiro.html', 'Financeiro']);
    }
  } catch {}
  nav.innerHTML = items.map(([href, label]) => `<a href="${href}"${current === href ? ' class="active"' : ''}>${label}</a>`).join('') + '<button class="nav-logout" type="button">Sair</button>';
  nav.querySelector('.nav-logout').onclick = () => {
    localStorage.removeItem('torksToken');
    localStorage.removeItem('torksUser');
    location.href = 'login.html';
  };
  const planButton = document.querySelector('.dash aside .plan button');
  if (planButton) {
    planButton.textContent = 'Ver assinatura';
    planButton.onclick = () => { location.href = 'conta.html'; };
  }
})();
