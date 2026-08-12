const crypto = require('node:crypto');
const Billing = require('../models/Billing');
const User = require('../models/User');
const mp = require('../services/mercadoPagoService');
const ApiError = require('../utils/ApiError');
const bcrypt = require('bcryptjs');
const receipt = require('../services/receiptService');

function verifyWebhook(req, dataId) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const signature = String(req.headers['x-signature'] || '');
  if (!secret || !signature) return;
  const requestId = String(req.headers['x-request-id'] || '');
  const parts = Object.fromEntries(signature.split(',').map(part => part.trim().split('=')));
  if (!parts.ts || !parts.v1 || !requestId || !dataId) throw new ApiError(401, 'Assinatura do webhook incompleta.');
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const providedBuffer = Buffer.from(parts.v1);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) throw new ApiError(401, 'Assinatura do webhook inválida.');
}

exports.plans = async (_req, res) => res.json({ data: { plans: await Billing.plans(), configured: mp.isConfigured() } });
exports.mine = async (req, res) => res.json({ data: { subscription: await Billing.mySubscription(req.userId), payments: await Billing.myPayments(req.userId), credits: await User.creditHistory(req.userId) } });
exports.checkout = async (req, res) => { const plan = await Billing.plan(req.body.planId); if (!plan) throw new ApiError(404, 'Plano não encontrado.'); if (plan.priceCents === 0) return res.status(201).json({ data: await Billing.activateFree(req.userId, plan) }); if (!mp.isConfigured()) throw new ApiError(503, 'O Mercado Pago ainda não foi configurado pelo administrador.'); const user = await User.findPublicById(req.userId); if (!user.cpf) throw new ApiError(422, 'Cadastre seu CPF antes de continuar com o pagamento.'); return res.status(201).json({ data: await mp.createSubscription(user, plan) }); };
exports.webhook = async (req, res) => { const id = req.body?.data?.id || req.query['data.id'] || req.query.id; verifyWebhook(req, id); res.status(200).json({ received: true }); const type = req.body?.type || req.query.type || req.body?.action?.split('.')[0] || 'preapproval'; if (id) mp.syncWebhook(String(type), String(id)).catch(error => console.error('Webhook Mercado Pago:', error.message)); };
exports.cancel=async(req,res)=>{const subscription=await Billing.mySubscription(req.userId),publicUser=await User.findPublicById(req.userId),user=await User.findByEmail(publicUser.email);if(!subscription||!['active','pending','paused'].includes(subscription.status))throw new ApiError(409,'Não há assinatura ativa para cancelar.');if(!await bcrypt.compare(String(req.body.password||''),user.password_hash))throw new ApiError(403,'Senha incorreta. A assinatura não foi cancelada.');if(subscription.provider==='mercado_pago'&&subscription.providerSubscriptionId){if(!mp.isConfigured())throw new ApiError(503,'O Mercado Pago precisa estar configurado para cancelar esta assinatura com segurança.');await mp.cancelSubscription(subscription.providerSubscriptionId)}await Billing.cancel(req.userId,subscription.id);return res.json({data:{message:'Assinatura cancelada. O histórico e seus dados continuam disponíveis.'}})};
exports.renew=async(req,res)=>{const subscription=await Billing.mySubscription(req.userId);if(!subscription?.planId)throw new ApiError(409,'Escolha um plano para continuar.');const plan=await Billing.plan(subscription.planId);if(plan.priceCents===0)return res.status(201).json({data:await Billing.activateFree(req.userId,plan)});if(!mp.isConfigured())throw new ApiError(503,'O Mercado Pago ainda não foi configurado.');const user=await User.findPublicById(req.userId);return res.status(201).json({data:await mp.createSubscription(user,plan)})};
exports.receipt=async(req,res)=>{const payment=await Billing.payment(req.userId,req.params.id);if(!payment)throw new ApiError(404,'Pagamento não encontrado.');if(!['approved','paid'].includes(payment.status))throw new ApiError(409,'O comprovante fica disponível após a aprovação do pagamento.');const user=await User.findPublicById(req.userId),pdf=receipt.pdf(payment,user);res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="comprovante-torks-${payment.id}.pdf"`,'Content-Length':pdf.length,'Cache-Control':'private, no-store'});return res.send(pdf)};
