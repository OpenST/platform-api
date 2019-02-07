#!/usr/bin/env node
'use strict';

const program = require('commander');

const rootPrefix = '../..',
  FundGranterAddress = require(rootPrefix + '/lib/setup/originChain/FundGranterAddress'),
  GenerateAuxAddress = require(rootPrefix + '/devops/utils/chainAddress/GenerateAuxAddress'),
  GenerateOriginAddress = require(rootPrefix + '/devops/utils/chainAddress/GenerateOriginAddress'),
  GenerateMasterInternalFunderAddress = require(rootPrefix +
    '/devops/utils/chainAddress/GenerateMasterInternalFunderAddress'),
  FundMasterInternalFunderAddress = require(rootPrefix + '/devops/utils/chainAddress/FundMasterInternalFunderAddress'),
  ExceptProductionMain = require(rootPrefix + '/lib/setup/originChain/ExceptProductionMain');

program
  .version('0.1.0')
  .usage('[options]')
  .option('-m, --generate-master-internal-funder-address', 'Generate master internal funder address for this ENV')
  .option('-n, --fund-master-internal-funder-address', 'Fund master internal funder with ETH')
  .option('-o, --generate-origin-addresses', 'Generate addresses required for origin chain')
  .option('-a, --generate-aux-addresses', 'Generate addresses required for auxiliary chain')
  .option('-d, --deploy-st-contracts', 'Generate addresses required for auxiliary chain')
  .option('-f, --fund-granter', 'Fund granter with ETH and OST')
  .option('-c, --chain-id <number>', 'Chain id required for actions -o, -a and -d', parseInt)
  .option('-e, --eth-owner-private-key <string>', 'ETH sender private key. Required for action -n')
  .option('-s, --st-owner-private-key <string>', 'ST Owner private key. Required for action -f')
  .option('-t, --amount <string>', 'Amount that needs to be transfered')
  .parse(process.argv);

const handleError = function() {
  program.outputHelp();
  throw 'Required parameters are missing!';
};

let performerObj = null,
  performOptions = {};

const Main = async function() {
  if (program.generateMasterInternalFunderAddress) {
    let chainId = program.chainId;

    if (!chainId) {
      handleError();
    }

    performerObj = new GenerateMasterInternalFunderAddress(chainId);
  } else if (program.fundMasterMnternalFunderAddress) {
    let chainId = program.chainId,
      ethOwnerPrivateKey = program.ethOwnerPrivateKey,
      amount = program.amount;

    if (!chainId || !ethOwnerPrivateKey || !amount) {
      handleError();
    }

    performerObj = new FundMasterInternalFunderAddress(chainId, ethOwnerPrivateKey, parseFloat(amount));
  } else if (program.generateOriginAddresses) {
    let chainId = program.chainId;

    if (!chainId) {
      handleError();
    }

    performerObj = new GenerateOriginAddress(chainId);
  } else if (program.generateAuxAddresses) {
    let chainId = program.chainId;

    if (!chainId) {
      handleError();
    }

    performerObj = new GenerateAuxAddress(chainId);
  } else if (program.deployStContracts) {
    let chainId = program.chainId,
      ethSenderPk = program.ethSenderPk;

    if (!chainId || !ethSenderPk) {
      handleError();
    }

    performerObj = new ExceptProductionMain(chainId, ethSenderPk);
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
