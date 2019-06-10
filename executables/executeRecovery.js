/**
 * Class for execute recovery cron.
 *
 * @module executables/executeRecovery
 */

const program = require('commander');

const rootPrefix = '..',
  ChainDetails = require(rootPrefix + '/app/services/chain/Get'),
  PublisherBase = require(rootPrefix + '/executables/rabbitmq/PublisherBase'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  ProcessRecoveryRequest = require(rootPrefix +
    '/lib/deviceRecovery/byRecoveryController/executeRecovery/ProcessRecoveryRequest'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

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

const cronProcessId = +program.cronProcessId;
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

    logger.step('Cron completed.');
  }

  /**
   * Cron kind
   *
   * @returns {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.executeRecovery;
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Specific validations
   *
   * @return {Promise<void>}
   * @private
   */
  async _specificValidations() {
    const oThis = this;

    // Validate chainId
    if (!oThis.chainId) {
      let errMsg = 'Invalid chainId. Exiting the cron.';

      logger.error(errMsg);
      return Promise.reject(errMsg);
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
        'chain_id = (?) AND execute_after_blocks < (?) AND status = (?)',
        oThis.chainId,
        oThis.currentBlockNumber,
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.waitingForAdminActionStatus]
      ])
      .fire();

    logger.log('Processing ', oThis.recoveryOperations.length, ' recovery requests.');

    oThis.canExit = false;
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

    logger.log('Recovery operations workflow initiated.');
    oThis.canExit = true;
  }
}

// Perform action
new ExecuteRecovery({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
