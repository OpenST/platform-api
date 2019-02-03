#!/usr/bin/env node
'use strict';

const program = require('commander');

const rootPrefix = '../..',
  FundGranterAddress = require(rootPrefix + '/lib/setup/originChain/FundGranterAddress'),
  GenerateAuxAddress = require(rootPrefix + '/devops/utils/chainAddress/GenerateAuxAddress'),
  GenerateOriginAddress = require(rootPrefix + '/devops/utils/chainAddress/GenerateOriginAddress'),
  ExceptProductionMain = require(rootPrefix + '/lib/setup/originChain/ExceptProductionMain');

program
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
  program.outputHelp();
  throw 'Required parameters are missing!';
};

let performerObj = null,
  performOptions = {};

const Main = async function() {
  if (program.generateOriginAddresses) {
    let chainId = program.chainId,
      ethSenderPk = program.ethSenderPk;

    if (!chainId || !ethSenderPk) {
      handleError();
    }

    performerObj = new GenerateOriginAddress(chainId, ethSenderPk);
  } else if (program.generateAuxAddresses) {
    let chaiId = program.chainId;

    if (!chaiId) {
      handleError();
    }

    performerObj = new GenerateAuxAddress(chaiId);
  } else if (program.deployStContracts) {
    let chaiId = program.chainId,
      ethSenderPk = program.ethSenderPk;

    if (!chaiId || !ethSenderPk) {
      handleError();
    }

    performerObj = new ExceptProductionMain(chaiId, ethSenderPk);
  } else if (program.fundGranter) {
    let ethSenderPk = program.ethSenderPk,
      stOwnerPk = program.stOwnerPk;

    if (!ethSenderPk || !stOwnerPk) {
      handleError();
    }

    performerObj = new FundGranterAddress(stOwnerPk, ethSenderPk);
  } else {
    return handleError();
  }

  let resp = await (performerObj ? performerObj.perform() : handleError());
  console.log(resp);
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
