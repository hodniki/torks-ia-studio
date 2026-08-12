const crypto = require('node:crypto');
const Billing = require('../models/Billing');

function configured() { return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN); }

async function mpFetch(path, options = {}) {
  if (!configured()) throw new Error('Mercado Pago ainda não foi configurado.');
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Falha na comunicação com o Mercado Pago.');
  return body;
}

exports.isConfigured = configured;

exports.configurationStatus = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY || '';
  const frontendUrl = process.env.FRONTEND_URL || '';
  const publicApiUrl = process.env.PUBLIC_API_URL || '';
  return {
    configured: Boolean(token),
    environment: token.startsWith('TEST-') ? 'test' : token ? 'production' : 'not_configured',
    accessToken: Boolean(token), publicKey: Boolean(publicKey),
    webhookSecret: Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET),
    frontendUrl, publicApiUrl,
    httpsReady: frontendUrl.startsWith('https://') && publicApiUrl.startsWith('https://'),
    webhookUrl: publicApiUrl ? `${publicApiUrl.replace(/\/$/, '')}/api/billing/webhook/mercado-pago` : null,
  };
};

exports.testConnection = async () => {
  const account = await mpFetch('/users/me');
  return { ok: true, accountId: String(account.id), nickname: account.nickname || null, siteId: account.site_id || null };
};

exports.createSubscription = async (user, plan) => {
  const externalReference = crypto.randomUUID();
  const local = await Billing.createPending(user.id, plan, externalReference);
  const publicApiUrl = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  const body = {
    reason: `Torks Studio - Plano ${plan.name}`,
    external_reference: externalReference,
    payer_email: user.email,
    back_url: `${(process.env.FRONTEND_URL || 'http://localhost:5500').replace(/\/$/, '')}/conta.html?pagamento=retorno`,
    ...(publicApiUrl && { notification_url: `${publicApiUrl}/api/billing/webhook/mercado-pago` }),
    auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: plan.priceCents / 100, currency_id: 'BRL' },
  };
  let result;
  try { result = await mpFetch('/preapproval', { method: 'POST', body: JSON.stringify(body) }); }
  catch (error) { await Billing.removePending(local.id).catch(()=>{}); throw error; }
  await Billing.attachProvider(local.id, result.id);
  return { checkoutUrl: result.init_point || result.sandbox_init_point, subscriptionId: local.id };
};
exports.cancelSubscription=async providerId=>mpFetch(`/preapproval/${encodeURIComponent(providerId)}`,{method:'PUT',body:JSON.stringify({status:'cancelled'})});
exports.refundPayment=async providerId=>mpFetch(`/v1/payments/${encodeURIComponent(providerId)}/refunds`,{method:'POST',body:'{}'});

exports.sync = async id => { const data = await mpFetch(`/preapproval/${encodeURIComponent(id)}`); await Billing.syncSubscription(id, data); return data; };
exports.syncPayment = async id => { const data = await mpFetch(`/v1/payments/${encodeURIComponent(id)}`), feeCents = Math.round((data.fee_details || []).reduce((total, fee) => total + Number(fee.amount || 0), 0) * 100), amountCents = Math.round(Number(data.transaction_amount || 0) * 100), netAmountCents = Math.round(Number(data.transaction_details?.net_received_amount ?? (amountCents - feeCents) / 100) * 100); await Billing.upsertPayment({ providerPaymentId: String(data.id), amountCents, currency: data.currency_id || 'BRL', status: data.status || 'pending', description: data.description || 'Assinatura Torks Studio', paidAt: data.date_approved || null, paymentMethod: data.payment_method_id || null, paymentType: data.payment_type_id || null, feeCents, netAmountCents, externalReference: data.external_reference }); return data; };
exports.syncWebhook = async (type, id) => type === 'payment' ? exports.syncPayment(id) : exports.sync(id);
