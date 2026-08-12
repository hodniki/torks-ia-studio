const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const ffmpeg=require('ffmpeg-static');
const db=require('../config/database');
const mp=require('./mercadoPagoService');
const email=require('./emailService');
const uploads=path.join(__dirname,'../../uploads');
const item=(id,label,status,detail,category)=>({id,label,status,detail,category});
const run=(command,args)=>new Promise((resolve,reject)=>{const child=spawn(command,args,{windowsHide:true});let error='';child.stderr.on('data',chunk=>error+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(error.slice(-300)||`Código ${code}`)));});

exports.status=()=>{
  const frontend=process.env.FRONTEND_URL||'';
  const api=process.env.PUBLIC_API_URL||'';
  const production=process.env.NODE_ENV==='production';
  const social=Boolean(process.env.INSTAGRAM_CLIENT_ID||process.env.TIKTOK_CLIENT_KEY||process.env.YOUTUBE_CLIENT_ID);
  return[
    item('database','Banco MySQL','ready','Configuração presente','Sistema'),
    item('jwt','Segurança de sessão',String(process.env.JWT_SECRET||'').length>=32?'ready':'error','Chave JWT com tamanho seguro','Segurança'),
    item('storage','Armazenamento de arquivos','ready','Diretório privado da aplicação','Sistema'),
    item('ffmpeg','Renderização FFmpeg',ffmpeg?'ready':'error',ffmpeg?'Executável instalado':'Executável ausente','Vídeo'),
    item('smtp','Envio de e-mail',process.env.SMTP_HOST?'ready':'pending',process.env.SMTP_HOST?'SMTP configurado':'Pendente configurar SMTP','Integrações'),
    item('mercadoPago','Mercado Pago',mp.isConfigured()?'ready':'pending',mp.isConfigured()?'Credencial presente':'Pendente Access Token','Integrações'),
    item('social','Redes sociais',social?'ready':'pending',social?'Credenciais OAuth presentes':'OAuth de Instagram, TikTok e YouTube pendente','Integrações'),
    item('urls','URLs públicas',frontend&&api?(production&&(!frontend.startsWith('https://')||!api.startsWith('https://'))?'warning':'ready'):'pending',frontend&&api?`${frontend} · ${api}`:'FRONTEND_URL e PUBLIC_API_URL pendentes','Publicação'),
    item('environment','Ambiente',production?'ready':'warning',production?'Produção':'Desenvolvimento local','Publicação'),
  ];
};

exports.test=async()=>{
  const results=[];
  async function test(id,label,category,fn,pending){if(pending){results.push(item(id,label,'pending',pending,category));return;}try{const detail=await fn();results.push(item(id,label,'ready',detail||'Teste aprovado',category));}catch(error){results.push(item(id,label,'error',error.message.slice(0,180),category));}}
  await test('database','Banco MySQL','Sistema',async()=>{await db.checkConnection();return'Conexão aprovada';});
  await test('storage','Gravação de arquivos','Sistema',async()=>{await fs.mkdir(uploads,{recursive:true});const file=path.join(uploads,`.health-${crypto.randomUUID()}`);await fs.writeFile(file,'ok');await fs.rm(file,{force:true});return'Escrita e remoção aprovadas';});
  await test('ffmpeg','Renderização FFmpeg','Vídeo',async()=>{await run(ffmpeg,['-version']);return'Executável respondeu corretamente';},!ffmpeg?'FFmpeg ausente':null);
  await test('smtp','Servidor de e-mail','Integrações',()=>email.verifyConnection(),!process.env.SMTP_HOST?'Configure SMTP_HOST para testar':null);
  await test('mercadoPago','Mercado Pago','Integrações',async()=>{const account=await mp.testConnection();return`Conta ${account.nickname||account.accountId} conectada`;},!mp.isConfigured()?'Configure o Access Token para testar':null);
  const social=Boolean(process.env.INSTAGRAM_CLIENT_ID||process.env.TIKTOK_CLIENT_KEY||process.env.YOUTUBE_CLIENT_ID);
  results.push(item('social','Redes sociais',social?'warning':'pending',social?'Credenciais encontradas; OAuth individual deve ser validado':'Credenciais OAuth ainda não configuradas','Integrações'));
  return exports.status().map(current=>results.find(result=>result.id===current.id)||current);
};
