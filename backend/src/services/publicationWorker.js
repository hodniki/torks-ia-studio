const Schedule=require('../models/Schedule'),publisher=require('./socialPublisher');let running=false;
async function process(){if(running)return;running=true;try{for(const job of await Schedule.due()){try{const id=await publisher.publish(job);await Schedule.published(job.id,id)}catch(error){await Schedule.failed(job.id,error.message)}}}catch(error){console.error('Fila de publicações:',error.message)}finally{running=false}}
exports.schedule=()=>{const timer=setInterval(process,60000);timer.unref();setTimeout(process,5000).unref();return timer};exports.process=process;
