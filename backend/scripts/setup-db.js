require('dotenv').config();
const db=require('../src/config/database');
(async()=>{await db.initSchema();console.log('Banco MySQL e tabelas do Torks Studio configurados.')})().catch(error=>{console.error(`Falha na configuração: ${error.message}`);process.exitCode=1}).finally(()=>db.close());
