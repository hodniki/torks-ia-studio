# Torks Studio

Este projeto ja esta pronto para GitHub, Netlify e Render.

## Publicar o site no Netlify

1. Envie esta pasta inteira para um repositorio no GitHub.
2. No Netlify, clique em **Add new site** e escolha o repositorio.
3. Clique em **Deploy site**. O arquivo `netlify.toml` ja seleciona a pasta `frontend`.

## Publicar a API no Render

1. No Render, clique em **New +** e depois em **Blueprint**.
2. Escolha o mesmo repositorio.
3. O Render encontra o arquivo `render.yaml` e publica a API.
4. Copie a URL entregue pelo Render.

## Ligar site e API

Abra `frontend/js/config.js` no GitHub e troque a linha pela URL da sua API:

```js
window.TORKS_API_URL = 'https://SUA-API.onrender.com/api';
```

Faca o commit. O Netlify atualiza o site automaticamente.
