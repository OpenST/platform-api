#!/usr/bin/env node
'use strict';

const rootPrefix = '../..',
  command = require('commander'),
  InsertCronKlass = require(rootPrefix + '/devops/utils/cronServices/CreateCron.js'),
  UpdateCronKlass = require(rootPrefix + '/devops/utils/cronServices/UpdateCron.js');


command
  .version('0.1.0')
  .usage('[options]')
  .option('-c, --create', 'Make an entry for cron job')
  .option('-u, --update', 'Make an entry for update job')
  .option('-i, --identifier <required>', 'identifier array ')
  .option('-f, --in-file <required>', 'Input JSON for task')
  .option('-o, --out-file <required>', 'Output JSON for task')
  .option('-s,--status <required>','status to be updated')
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
  else if(command.update) {
    performerObj = new UpdateCronKlass(
      {
        ids:(command.identifier).split(" "),
        status:command.status
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
