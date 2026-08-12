# Torks Studio API

API Express com MySQL, JWT, bcrypt, Mercado Pago e processamento de vídeo.

## Preparação

1. Copie `.env.example` para `.env`.
2. Preencha a conexão MySQL por `DATABASE_URL` ou pelos campos `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`.
3. Execute `npm install`.
4. Execute `npm run db:setup` e `npm run db:verify`.
5. Inicie com `npm run dev` ou `npm start`.

O esquema usado é `sql/init.mysql.sql`. A API e o site são servidos pelo mesmo processo na porta definida por `PORT`.

## Rotas principais

- `POST /api/auth/register` — exige nome, telefone, CPF, e-mail e senha
- `POST /api/auth/login`
- `GET|PUT /api/users/me`
- `GET|POST /api/projects`
- `POST /api/videos/generate`
- `GET /api/videos`
- `GET /api/templates`
- `GET|POST /api/schedules`
- `GET|POST /api/billing`
- `/api/admin/*` — acesso exclusivo do usuário Master
