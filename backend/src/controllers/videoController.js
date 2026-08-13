const videoService = require('../services/videoService');
const Video = require('../models/Video');
const RenderJob = require('../models/RenderJob');
const ApiError = require('../utils/ApiError');

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
  const video = await Video.findOwned(req.userId, req.params.id);
  if (!video) throw new ApiError(404, 'Vídeo não encontrado.');
  if (video.status === 'ready' && video.fileUrl) return res.json({ data: { id: video.id, status: 'completed', fileUrl: video.fileUrl } });
  const job = await RenderJob.enqueue(req.userId, video.id);
  return res.status(202).json({ data: { id: video.id, jobId: job.id, status: job.status } });
};

exports.renderStatus = async (req, res) => { const video = await Video.findOwned(req.userId, req.params.id); if (!video) throw new ApiError(404, 'Vídeo não encontrado.'); const job = await RenderJob.status(req.userId, video.id); return res.json({ data: { id: video.id, status: job?.status || video.status, errorMessage: job?.errorMessage || video.metadata?.renderError || null, fileUrl: video.fileUrl || null } }); };
