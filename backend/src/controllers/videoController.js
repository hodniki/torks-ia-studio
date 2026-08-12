const videoService = require('../services/videoService');
const Video = require('../models/Video');
const renderService = require('../services/renderService');

exports.list = async (req, res) => res.json({ data: await Video.list(req.userId) });

exports.uploadReference = async (req, res) => {
  if (!req.file) return res.status(422).json({ error: 'Selecione uma imagem ou vídeo.' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.status(201).json({ data: { url, filename: req.file.filename, mediaType: req.file.mimetype.startsWith('video/') ? 'video' : 'image' } });
};

exports.generate = async (req, res) => {
  const { project, video } = await videoService.generateDraft(req.userId, req.body);
  return res.status(201).json({
    data: {
      ...project,
      video,
      message: 'Projeto e roteiro inicial criados com sucesso.',
    },
  });
};

exports.render = async (req, res) => {
  const publicBaseUrl = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
  const fileUrl = await renderService.render(req.userId, req.params.id, publicBaseUrl.replace(/\/$/, ''));
  return res.json({ data: { id: req.params.id, status: 'ready', fileUrl } });
};
