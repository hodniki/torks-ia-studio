// No computador usa a API local. Na hospedagem usa o endereço público planejado.
const localTorks = ['localhost', '127.0.0.1'].includes(location.hostname);
window.TORKS_API_URL = localTorks ? 'http://localhost:3000/api' : '/api';
if(!document.querySelector('script[data-legal]')){document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="css/legal.css">');const legal=document.createElement('script');legal.src='js/legal.js';legal.defer=true;legal.dataset.legal='true';document.head.appendChild(legal)}
