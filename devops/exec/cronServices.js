#!/usr/bin/env node
'use strict';

const rootPrefix = '../..',
  command = require('commander'),
  InsertCronKlass = require(rootPrefix + '/devops/utils/cronServices/CreateCron.js');

command
  .version('0.1.0')
  .usage('[options]')
  .option('-c, --create', 'Make an entry for cron job')
  .option('-f, --in-file <required>', 'Input JSON for task')
  .option('-o, --out-file <required>', 'Output JSON for task')
  .parse(process.argv);

const handleError = function() {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

const Main = async function() {
  let performerObj = null;

  if (command.create) {
    performerObj = new InsertCronKlass(command.inFile, command.outFile);
  } else {
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
