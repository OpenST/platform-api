'use strict';
const rootPrefix = '..';
const program = require('commander');

program.option('-d,--dbParams <dbparams>','json db params').parse(process.argv);

program.on('--help', function() {
  console.log('    node cron_process.js --dbParams dbparams');
});

if (!program.dbParams) {
  program.help();
  process.exit(1);
}
var cron_process = function() {
};
 cron_process.prototype = {
   insertInDb: async function () {
     var json_data=json.parse(program.dbParams);
     var shell = require('shelljs');
     json_data.ip_address=shell.exec("hostname -i").stdout.toString().replace(/\r?\n|\r/g, " ");
     var CronProcessModel = require(rootPrefix+'/app/models/mysql/CronProcesses'),
       cronProcessObj = new CronProcessModel();
     await cronProcessObj.insertRecord(JSON.stringify(json_data)).then(function(rsp){console.log(rsp.id)}).catch(console.log)
   }
 };

var cron_processObj= new cron_process();
cron_processObj.insertInDb();
