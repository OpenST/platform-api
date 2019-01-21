#!/usr/bin/env node
'use strict';

const rootPrefix = '../..',
  AddGlobalConfig = require(rootPrefix + '/lib/setup/ConfigStrategy/AddGlobalConfig'),
  AddAuxConfig = require(rootPrefix + '/lib/setup/ConfigStrategy/AddAuxConfig'),
  ActivateConfig = require(rootPrefix + '/lib/setup/ConfigStrategy/ActivateConfig');

const command = require('commander'),
  path = require('path'),
  appRootPath = path.resolve(__dirname, rootPrefix);

command
  .version('0.1.0')
  .usage('[options]')
  .option('-g, --add-global-configs', 'Add global config')
  .option('-a, --add-aux-configs', 'Add auxiliary config')
  .option('-t, --activate-configs', 'Activate config for chain and group')
  .option('-f, --config-file-path <required>', 'Config file absolute path for action -g or -a')
  .option('-n, --chain-id <required>', 'Chain id for action -t')
  .option('-p, --group-id <required>', 'Group id for action -t')
  .parse(process.argv);

const handleError = function() {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

let performerObj = null,
  performOptions = {};

const Main = async function() {
  if (command.addGlobalConfigs) {
    let configFilePath =
      command.configFilePath === undefined
        ? `${appRootPath}/config-samples/development/global_config.json`
        : command.configFilePath;

    performerObj = new AddGlobalConfig(configFilePath);
  } else if (command.addAuxConfigs) {
    let configFilePath =
      command.configFilePath === undefined
        ? `${appRootPath}/config-samples/development/aux_config.json`
        : command.configFilePath;

    if (!configFilePath) {
      handleError();
    }

    performerObj = new AddAuxConfig(configFilePath);
  } else if (command.ActivateConfigs) {
    let chainId = command.chainId,
      groupId = command.groupId;

    if (!chainId || !groupId) {
      handleError();
    }

    performerObj = new ActivateConfig(chainId, groupId);
  } else {
    return handleError();
  }

  let resp = await (performerObj ? performerObj.perform() : handleError());
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
