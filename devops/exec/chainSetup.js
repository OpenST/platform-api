#!/usr/bin/env node
'use strict';

const program = require('commander');

const rootPrefix = '../..',
  GenerateAuxAddress = require(rootPrefix + '/devops/utils/chainAddress/GenerateAuxAddress'),
  GenerateOriginAddress = require(rootPrefix + '/devops/utils/chainAddress/GenerateOriginAddress'),
  GenerateMasterInternalFunderAddress = require(rootPrefix +
    '/devops/utils/chainAddress/GenerateMasterInternalFunderAddress'),
  FundMasterInternalFunderAddress = require(rootPrefix + '/devops/utils/chainAddress/FundMasterInternalFunderAddress'),
  SetupSimpleToken = require(rootPrefix + '/lib/setup/originChain/SetupSimpleToken'),
  DeployMockToken = require(rootPrefix + '/lib/setup/originChain/DeployMockToken'),
  DevOpsCommonHelper = require(rootPrefix + '/devops/utils/Common');

program
  .version('0.1.0')
  .usage('[options]')
  .option('--generate-master-internal-funder-address', 'Generate master internal funder address for this ENV')
  .option('--fund-master-internal-funder-address', 'Fund master internal funder with ETH')
  .option('--generate-origin-addresses', 'Generate addresses required for origin chain')
  .option('--generate-aux-addresses', 'Generate addresses required for auxiliary chain')
  .option('--setup-simple-token', 'Setup SimpleToken and associated contracts')
  .option('--deploy-mock-token', 'Deploy MockToken')
  .option('--chain-id <number>', 'Chain id required for actions -o, -a and -d', parseInt)
  .option('--eth-owner-private-key <string>', 'ETH sender private key. Required for action -n')
  .option('--st-owner-private-key <string>', 'ST Owner private key. Required for action -f')
  .option('--amount <string>', 'Amount that needs to be transfered, Required for action -n')
  .option('--out-file <string>', 'Output file which will hold the command execution output')
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
  } else if (program.fundMasterInternalFunderAddress) {
    let chainId = program.chainId,
      ethOwnerPrivateKey = program.ethOwnerPrivateKey,
      amount = program.amount;

    if (!chainId || !ethOwnerPrivateKey || !amount) {
      handleError();
    }

    performerObj = new FundMasterInternalFunderAddress(chainId, ethOwnerPrivateKey, amount);
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
  } else if (program.setupSimpleToken) {
    let env = process.env['SA_ENVIRONMENT'],
      subEnv = process.env['SA_SUB_ENVIRONMENT'];

    if (!env && !subEnv) {
      throw 'Either SA_ENVIRONMENT or SA_SUB_ENVIRONMENT is not set!';
    }

    // Do this only for non-production-main env
    if (env === 'production' && subEnv === 'main') {
      throw 'This step is not allowed for production-main ENV. Either this has already done or ask Sunil! :)';
    }

    if (!program.chainId && !program.ethOwnerPrivateKey) {
      handleError();
    }

    performerObj = new SetupSimpleToken(program.chainId, program.ethOwnerPrivateKey);
  } else if (program.deployMockToken) {
    let env = process.env['SA_ENVIRONMENT'],
      subEnv = process.env['SA_SUB_ENVIRONMENT'];

    if (!env && !subEnv) {
      throw 'Either SA_ENVIRONMENT or SA_SUB_ENVIRONMENT is not set!';
    }

    // Do this only for non-production-main env
    if (env === 'production' && subEnv === 'main') {
      throw 'This step is not allowed for production-main ENV. Either this has already done or ask Sunil! :)';
    }

    if (!program.chainId) {
      handleError();
    }

    performerObj = new DeployMockToken(program.chainId);
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
    console.log('\nMain data: ', data);
    if (program.outFile) {
      new DevOpsCommonHelper().parseCmdOutput(program.outFile, data.data);
    }
    process.exit(0);
  })
  .catch(function(err) {
    console.error('\nMain error: ', err);
    process.exit(1);
  });
