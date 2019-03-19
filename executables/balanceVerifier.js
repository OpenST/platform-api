'use strict';
/**
 * This executable is used to verify balances.
 *
 * @module executables/balanceVerifier
 */

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  CronProcessesModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  program = require('commander'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/balanceVerifier.js --cronProcessId 28');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/BalanceVerifier');

class BalanceVerifier extends CronBase {
  /**
   *
   * @param {object} params
   * @param {Number} params.cronProcessId  - cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.canExit = true;
  }

  async _start() {
    const oThis = this,
      strategyByChainHelperObj = new StrategyByChainHelper(oThis.auxChainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure() || !CommonValidators.validateObject(configStrategyResp.data)) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    oThis.ic = new InstanceComposer(configStrategyResp.data);

    let BalanceVerifier = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceVerifier');

    console.log('timeStamp', oThis.timeStamp);

    let balanceVerifierObj = new BalanceVerifier({
      timeStamp: oThis.timeStamp
    });

    let balanceVerifierResponse = await balanceVerifierObj.perform();
    console.log('balanceVerifierResponse', balanceVerifierResponse.data);
    if (balanceVerifierResponse.isSuccess()) {
      let cronParams = {
          auxChainId: oThis.auxChainId,
          timeStamp: balanceVerifierResponse.data.timeStamp
        },
        stringifiedCronParams = JSON.stringify(cronParams);

      await new CronProcessesModel()
        .update({
          params: stringifiedCronParams
        })
        .where({
          id: oThis.cronProcessId
        })
        .fire();
    }
  }

  /**
   *
   * This function provides info whether the process has to exit.
   *
   * @returns {string}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   *
   * @private
   */
  _validateAndSanitize() {
    return;
  }

  get _cronKind() {
    return cronProcessesConstants.balanceVerifier;
  }
}

const balanceVerifier = new BalanceVerifier({ cronProcessId: +program.cronProcessId });

balanceVerifier.perform().then(async function() {
  setTimeout(function() {
    //Call StopProcess of CronProcessHandler
    process.emit('SIGINT');
  }, 100000); //To kill the process after 5 seconds expecting that the cache will be set by then.
});
