/**
 * Class for execute recovery cron.
 *
 * @module executables/executeRecovery
 */

const program = require('commander');

const rootPrefix = '..',
  ChainDetails = require(rootPrefix + '/app/services/chain/Get'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  PublisherBase = require(rootPrefix + '/executables/rabbitmq/PublisherBase'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  ProcessRecoveryRequest = require(rootPrefix +
    '/lib/deviceRecovery/byRecoveryController/executeRecovery/ProcessRecoveryRequest');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/shared/BlockTimeDetails');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/executeRecovery.js --cronProcessId 19');
  logger.log('');
  logger.log('');
});

let cronProcessId = +program.cronProcessId;
if (!cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for execute recovery  cron.
 *
 * @class ExecuteRecovery
 */
class ExecuteRecovery extends PublisherBase {
  /**
   * Constructor for execute recovery  cron.
   *
   * @augments PublisherBase
   *
   * @param {Object} params: params object
   * @param {Number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true; // Denotes whether process can exit or not.

    oThis.currentBlockNumber = null;
  }

  async _start() {
    const oThis = this;

    await oThis._fetchCurrentBlockNumber();

    await oThis._startExecuteRecovery();
  }

  /**
   * Sanitizes and validates the input parameters. ChainId is not validated here as it is already validated
   * before calling the perform method of the class.
   *
   * @private
   */
  _specificValidations() {
    const oThis = this;

    // Validate chainId
    if (!oThis.chainId) {
      logger.error('Invalid chainId. Exiting the cron.');
      process.emit('SIGINT');
    }

    logger.step('All validations done.');
  }

  /**
   * This method fetches the current block number of the chain after performing validations on the chainId.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchCurrentBlockNumber() {
    const oThis = this,
      chainDetailsObj = new ChainDetails({ chain_id: oThis.chainId }),
      chainDetailsRsp = await chainDetailsObj.perform();

    if (chainDetailsRsp.isFailure()) {
      logger.error('Invalid chainId.');
      process.emit('SIGINT');
    }

    oThis.currentBlockNumber = chainDetailsRsp.data.chain.blockHeight;
  }

  /**
   * Fetch recovery operations which need to be executed.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _startExecuteRecovery() {
    const oThis = this,
      recoveryOperationObj = new RecoveryOperationModel(),
      promisesArray = [];

    oThis.recoveryOperations = await recoveryOperationObj
      .select('*')
      .where([
        'execute_after_blocks < (?) AND status = (?)',
        oThis.currentBlockNumber,
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.waitingForAdminActionStatus]
      ])
      .fire();

    logger.log('Processing ', oThis.recoveryOperations.length, ' recovery requests.');

    for (let index = 0; index < oThis.recoveryOperations.length; index++) {
      const recoveryOperationEntity = oThis.recoveryOperations[index];

      promisesArray.push(
        new ProcessRecoveryRequest({
          userId: recoveryOperationEntity.user_id,
          initiateRecoveryOperationId: recoveryOperationEntity.id
        }).perform()
      );
    }

    await Promise.all(promisesArray);

    logger.log('Execute recovery operations completed.');
  }
}

new ExecuteRecovery({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 30 * 60 * 1000);
