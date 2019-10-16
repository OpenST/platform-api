#!/usr/bin/env node
'use strict';

const rootPrefix = '../..',
  command = require('commander'),
  InsertCronKlass = require(rootPrefix + '/devops/utils/cronServices/CreateCron.js'),
  StopCronKlass = require(rootPrefix + '/devops/utils/cronServices/StopCron.js');

command
  .version('0.1.0')
  .usage('[options]')
  .option('--create', 'Make an entry for cron job')
  .option('--stop-stuck-cron', 'Make an entry for update job')
  .option('--identifiers <required>', 'identifier array ')
  .option('--in-file <required>', 'Input JSON for task')
  .option('--out-file <required>', 'Output JSON for task')
  .parse(process.argv);

const handleError = function() {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

const Main = async function() {
  let performerObj = null;

  if (command.create) {
    performerObj = new InsertCronKlass(command.inFile, command.outFile);
  }
  else if(command.stopStuckCron) {
    let ids=(command.identifiers).split(" ");
    if (ids.length < 1){
      throw "ids cannot be empty"
    }
    performerObj = new StopCronKlass(
      {
        ids: ids,
      }
    );
  }
  else {
    handleError();
  }

  let resp = performerObj ? await performerObj.perform() : handleError();
  if (resp.isFailure()) {
    throw resp;
  }

  return resp;
};

Main()
  .then(function(data) {
    console.error('\ndevops/exec/cronServices.js::data: ', JSON.stringify(data));
    process.exit(0);
  })
  .catch(function(err) {
    console.error('\ndevops/exec/cronServices.js::error: ', err);
    process.exit(1);
  });
