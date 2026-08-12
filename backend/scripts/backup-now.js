require('dotenv').config();
require('../src/services/backupService').create().then(target=>console.log(`Backup concluído em ${target}`)).catch(error=>{console.error(`Falha no backup: ${error.message}`);process.exit(1)});
