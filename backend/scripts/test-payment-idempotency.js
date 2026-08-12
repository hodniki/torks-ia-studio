require('dotenv').config();
const crypto=require('node:crypto');
const db=require('../src/config/database');
const Billing=require('../src/models/Billing');

(async()=>{
  const user=(await db.query("SELECT id,credits_remaining FROM users WHERE email_verified_at IS NOT NULL ORDER BY created_at LIMIT 1")).rows[0];
  const plan=(await db.query("SELECT id,name,credits FROM subscription_plans WHERE price_cents>0 AND active=TRUE ORDER BY price_cents LIMIT 1")).rows[0];
  if(!user||!plan)throw Error('Usuário ou plano indisponível.');
  const providerId=`idempotency-${crypto.randomUUID()}`,externalReference=crypto.randomUUID(),validUntil=new Date(Date.now()+30*86400000).toISOString();
  const subscription=(await db.query("INSERT INTO subscriptions(user_id,provider,provider_subscription_id,plan,status,plan_id,external_reference) VALUES($1,'mercado_pago',$2,$3,'pending',$4,$5) RETURNING id",[user.id,providerId,plan.name,plan.id,externalReference])).rows[0];
  try{
    const first=await Billing.syncSubscription(providerId,{status:'authorized',next_payment_date:validUntil});
    const second=await Billing.syncSubscription(providerId,{status:'authorized',next_payment_date:validUntil});
    const count=Number((await db.query("SELECT COUNT(*) FROM credit_transactions WHERE reference_key=$1",[`mercado-pago:${providerId}:${validUntil}`])).rows[0].count);
    if(!first.creditsGranted||second.creditsGranted||count!==1)throw Error('Webhook repetido concedeu créditos novamente.');
    console.log('Idempotência aprovada: webhook repetido gerou uma única concessão.');
  }finally{
    await db.query('DELETE FROM credit_transactions WHERE reference_key LIKE $1',[`mercado-pago:${providerId}:%`]);
    await db.query('DELETE FROM subscriptions WHERE id=$1',[subscription.id]);
    await db.query('UPDATE users SET credits_remaining=$2 WHERE id=$1',[user.id,user.credits_remaining]);
  }
})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>db.close());
