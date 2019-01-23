#!/usr/bin/env node
'use strict';

const rootPrefix = '../..',
  GenerateOriginAddress = require(rootPrefix + '/devops/utils/chainAddress/GenerateOriginAddress'),
  GenerateAuxAddress = require(rootPrefix + '/devops/utils/chainAddress/GenerateAuxAddress'),
  ForNonProductionMain = require(rootPrefix + '/lib/setup/originChain/ForNonProductionMain'),
  OnlyForDevEnv = require(rootPrefix + '/lib/setup/originChain/OnlyForDevEnv');

const command = require('commander');

command
  .version('0.1.0')
  .usage('[options]')
  .option('-o, --generate-origin-addresses', 'Generate addresses required for origin chain')
  .option('-a, --generate-aux-addresses', 'Generate addresses required for auxiliary chain')
  .option('-d, --deploy-st-contracts', 'Generate addresses required for auxiliary chain')
  .option('-f, --fund-granter', 'Fund granter with ETH and OST')
  .option('-c, --chain-id <number>', 'Chain id required for actions -o, -a and -d', parseInt)
  .option('-e, --eth-sender-pk <string>', 'ETH sender private key. Required for action -d and -f')
  .option('-s, --st-owner-pk <string>', 'ST Owner private key. Required for action -f')
  .parse(process.argv);

const handleError = function() {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

let performerObj = null,
  performOptions = {};

const Main = async function() {

  if (command.generateOriginAddresses) {

    let chaiId = command.chainId
      , ethSenderPk = command.ethSenderPk
    ;

    if (!chaiId || !ethSenderPk) {
      handleError();
    }

    performerObj = new GenerateOriginAddress(chaiId, ethSenderPk);

  } else if (command.generateAuxAddresses) {

    let chaiId = command.chainId;

    if (!chaiId) {
      handleError();
    }

    performerObj = new GenerateAuxAddress(chaiId);

  } else if (command.deployStContracts) {

    let chaiId = command.chainId
      , ethSenderPk = command.ethSenderPk
    ;

    if (!chaiId || !ethSenderPk) {
      handleError();
    }

    performerObj = new ForNonProductionMain(chaiId, ethSenderPk);

  } else if (command.fundGranter) {

    let ethSenderPk = command.ethSenderPk
      , stOwnerPk = command.stOwnerPk
    ;

    if (!ethSenderPk || !stOwnerPk) {
      handleError();
    }

    performerObj = new OnlyForDevEnv(stOwnerPk, ethSenderPk);

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
