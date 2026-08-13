# Torks Studio

Aplicação Node.js completa para criação e gestão de vídeos, preparada para a Hospedagem de Aplicativos Web da Hostinger com MySQL gerenciado.

## Executar localmente

1. Inicie o Docker Desktop.
2. Execute `docker compose run --rm api npm install`.
3. Execute `docker compose up`.
4. Abra `http://localhost:3000`.
5. Confirme a API em `http://localhost:3000/api/health`.

O MySQL local fica disponível na porta `3307`. O esquema de `backend/sql/init.mysql.sql` é aplicado automaticamente.

## Publicar na Hostinger

1. Envie este projeto para um repositório GitHub.
2. No hPanel, crie um banco em **Bancos de dados → MySQL** e anote host, porta, nome, usuário e senha.
3. Em **Sites → Adicionar site**, escolha **Aplicativo Node.js** e conecte o repositório.
4. Use a raiz do repositório, Node.js 20 ou superior, comando de instalação `npm install` e comando inicial `npm start`.
5. Cadastre as variáveis abaixo no ambiente da aplicação:
   - `NODE_ENV=production`
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `DB_SSL=false` — altere somente se a Hostinger fornecer conexão MySQL com TLS
   - `JWT_SECRET` — chave aleatória com pelo menos 32 caracteres
   - `MASTER_EMAIL=renanhodniki@gmail.com` — essa conta recebe acesso Master assim que for cadastrada
   - `GEMINI_API_KEY` — chave da API Gemini usada para gerar roteiros originais
   - `GEMINI_MODEL=gemini-2.5-flash-lite` — modelo configurável da geração de roteiro
   - `FRONTEND_URL=https://SEU-DOMINIO`
   - `PUBLIC_API_URL=https://SEU-DOMINIO`
   - `CORS_ORIGIN=https://SEU-DOMINIO`
   - dados SMTP e credenciais do Mercado Pago descritos em `backend/.env.example`
   - credenciais do Google Drive descritas em `backend/.env.example`, quando o armazenamento externo for ativado
6. Publique e teste `https://SEU-DOMINIO/api/health`.

O mesmo processo Node.js serve o site e a API. Em produção o frontend usa `/api`, portanto não é necessário configurar Netlify ou um subdomínio separado.

Os vídeos são enviados para uma fila persistente no MySQL. A requisição retorna imediatamente e o servidor processa o MP4 em segundo plano; o usuário pode acompanhar o estado em **Meus vídeos**.

## Banco

O projeto usa MySQL 8, `utf8mb4`, horário UTC, UUIDs e transações. A aplicação cria as tabelas ausentes ao iniciar. Como esta instalação é nova, não existe migração de dados do antigo PostgreSQL local.

Nunca coloque senhas, Access Tokens ou chaves reais no GitHub.

## Conta Master e Google Drive

A conta `renanhodniki@gmail.com` deve ser cadastrada normalmente, com telefone e CPF. Ao iniciar, o servidor compara o cadastro com `MASTER_EMAIL` e concede o perfil Master; nenhuma senha administrativa fica gravada no código.

O armazenamento no Google Drive pode seguir o mesmo OAuth usado no projeto RH Tecnologia. Antes de ativá-lo, crie um projeto no Google Cloud, habilite a Google Drive API, configure a tela de consentimento e gere um cliente OAuth do tipo Aplicativo da Web. A URI de redirecionamento deve apontar para `https://SEU-DOMINIO/api/google-drive/callback`. O Client Secret e o Refresh Token devem ficar somente nas variáveis protegidas da Hostinger.
