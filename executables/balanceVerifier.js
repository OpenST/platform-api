/**
 * This executable is used to verify balances.
 *
 * @module executables/balanceVerifier
 */

const program = require('commander'),
  OSTBase = require('@ostdotcom/base');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  CronProcessesModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
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

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/BalanceVerifier');

/**
 * Class for balance verifier executable.
 *
 * @class BalanceVerifier
 */
class BalanceVerifier extends CronBase {
  /**
   * Constructor for balance verifier executable.
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.canExit = true;
  }

  /**
   * Start the executable.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this,
      strategyByChainHelperObj = new StrategyByChainHelper(oThis.auxChainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure() || !CommonValidators.validateObject(configStrategyResp.data)) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    oThis.ic = new InstanceComposer(configStrategyResp.data);

    const BalanceVerifier = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceVerifier');

    while (true) {
      if (oThis.stopPickingUpNewWork) {
        oThis.canExit = true;
        break;
      }

      oThis.canExit = false;

      let balanceVerifierObj = new BalanceVerifier({
        timeStamp: oThis.timeStamp
      });
      const balanceVerifierResponse = await balanceVerifierObj.perform();

      if (balanceVerifierResponse.isSuccess()) {
        const cronParams = {
            auxChainId: oThis.auxChainId,
            timeStamp: balanceVerifierResponse.data.timeStamp
          },
          stringifiedCronParams = JSON.stringify(cronParams);

        oThis.timeStamp = balanceVerifierResponse.data.timeStamp;
        await new CronProcessesModel()
          .update({
            params: stringifiedCronParams
          })
          .where({
            id: oThis.cronProcessId
          })
          .fire();

        // Stop if current batch gets less transactions.
        if (balanceVerifierResponse.data.noOfTxFound < 1000) {
          oThis.canExit = true;
          break;
        }
      }

      oThis.canExit = true;
    }
  }

  /**
   * This function provides info whether the process has to exit.
   *
   * @returns {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Validate and sanitize.
   *
   * @private
   */
  async _validateAndSanitize() {
    return;
  }

  /**
   * Get cron kind.
   *
   * @returns {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.balanceVerifier;
  }
}

const balanceVerifier = new BalanceVerifier({ cronProcessId: +program.cronProcessId });

balanceVerifier.perform().then(async function() {
  setTimeout(function() {
    process.emit('SIGINT');
  }, 10000);
});
