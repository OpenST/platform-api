#!/usr/bin/env node
'use strict';

const rootPrefix = '../..',
  command = require('commander'),
  InsertCron = 'devops/utils/cronServices/InsertCron.js';

command
  .version('0.1.0')
  .usage('[options]')
  .option('-f, --cron-file <required>', 'Cron json path ')
  .option('-c, --create', 'Create crons ')
  .parse(process.argv);

const handleError = function() {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

const Main = async function() {
  let performerObj = null;

  performerObj = new InsertCron(command.cronFile);

  let resp = await performerObj.perform();
  if (resp.isFailure()) {
    throw resp;
  }

  return resp;
};
Main()
  .then(function(data) {
    console.error('\nMain data: ', data);
    process.exit(0);
  })
  .catch(function(err) {
    console.error('\nMain error: ', err);
    process.exit(1);
  });
