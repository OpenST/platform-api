'use strict';
/**
 * This code publishes blocks which are finalized so that aggregation can start
 *
 * Usage: node executables/blockScanner/Finalizer.js --cronProcessId <cronProcessId>
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/Finalizer
 */
const rootPrefix = '../..',
  program = require('commander'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  PublisherBase = require(rootPrefix + '/executables/rabbitmq/PublisherBase'),
  sharedRabbitMqProvider = require(rootPrefix + '/lib/providers/sharedNotification'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/Finalizer.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for Finalizer
 *
 * @class
 */
class Finalizer extends PublisherBase {
  /**
   * Constructor for transaction parser
   *
   * @param params {object} - params object
   * @param params.cronProcessId {number} - cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true; // Denotes whether process can exit or not.
  }

  async _start() {
    const oThis = this;

    // Validate whether chainId exists in the chains table.
    await oThis._validateChainId();

    await oThis._startFinalizer();
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

    // Validate blockDelay
    if (!oThis.blockDelay) {
      logger.error('Invalid blockDelay. Exiting the cron.');
      process.emit('SIGINT');
    }

    logger.step('All validations done.');
  }

  /**
   * This method validates whether the chainId passed actually exists in the chains
   * table in DynamoDB or not. This method internally initialises certain services
   * sets some variables as well.
   *
   * @private
   *
   * @returns {Promise<void>}
   */
  async _validateChainId() {
    // Fetch config strategy by chainId.
    const oThis = this;

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get ChainModel.
    const ChainModel = blockScannerObj.model.Chain,
      chainExists = await new ChainModel({}).checkIfChainIdExists(oThis.chainId);

    if (!chainExists) {
      logger.error('ChainId does not exist in the chains table.');
      process.emit('SIGINT');
    }

    // Initialize certain variables.
    oThis._init(blockScannerObj);

    logger.step('ChainID exists in chains table in dynamoDB.');
  }

  /**
   * Initializes block parser service and blockToProcess.
   *
   * @param {Object} blockScannerObj
   *
   * @private
   */
  _init(blockScannerObj) {
    const oThis = this;

    // Initialize BlockParser.
    oThis.Finalizer = blockScannerObj.block.Finalize;
    oThis.chainCronDataModel = blockScannerObj.model.ChainCronData;

    logger.step('Services initialised.');
  }

  /**
   *
   * @return {*[]}
   * @private
   */
  async _startFinalizer() {
    const oThis = this;

    while (true) {
      let finalizer = new oThis.Finalizer({
        chainId: oThis.chainId,
        blockDelay: oThis.blockDelay
      });

      oThis.canExit = false;
      let finalizerResponse = await finalizer.perform();

      let currentBlockNotProcessable = !finalizerResponse.data.blockProcessable;

      oThis.canExit = true;
      if (currentBlockNotProcessable) {
        logger.log('===Waiting for 2 secs');
        await oThis.sleep(2000);
      } else {
        if (finalizerResponse.data.processedBlock) {
          await oThis._updateLastProcessedBlock(finalizerResponse.data.processedBlock);

          await oThis._publishBlock(finalizerResponse.data.processedBlock);
        }
        oThis.canExit = true;
        logger.log('===Waiting for 10 milli-secs');
        await oThis.sleep(10);
      }
    }
  }

  /**
   * Sleep for particular time
   *
   * @param ms {Number}: time in ms
   *
   * @returns {Promise<any>}
   */
  sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  /**
   * updateLastProcessedBlock
   *
   * @return {Promise<void>}
   */
  async _updateLastProcessedBlock(blockNumber) {
    const oThis = this;

    let chainCronDataObj = new oThis.chainCronDataModel({});

    let updateParams = {
      chainId: oThis.chainId,
      lastFinalizedBlock: blockNumber
    };

    return chainCronDataObj.updateItem(updateParams);
  }

  /**
   * _publishBlock
   *
   * @param blockNumber
   * @return {Promise<void>}
   * @private
   */
  async _publishBlock(blockNumber) {
    const oThis = this;

    let messageParams = {
      topics: oThis._topicsToPublish,
      publisher: oThis._publisher,
      message: {
        kind: oThis._messageKind,
        payload: {
          chainId: oThis.chainId,
          blockNumber: blockNumber
        }
      }
    };

    let openSTNotification = await sharedRabbitMqProvider.getInstance({
        connectionWaitSeconds: connectionTimeoutConst.crons,
        switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
      }),
      setToRMQ = await openSTNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ====");
      return Promise.reject({ err: "Couldn't publish block number" + blockNumber });
    }
    logger.log('====published block', blockNumber);
  }

  /**
   * _topicsToPublish
   *
   * @return {*[]}
   * @private
   */
  get _topicsToPublish() {
    const oThis = this;

    return ['aggregator_' + oThis.chainId];
  }

  get _publisher() {
    const oThis = this;

    return 'OST';
  }

  get _messageKind() {
    const oThis = this;

    return 'background_job';
  }

  get _cronKind() {
    return cronProcessesConstants.blockFinalizer;
  }
}

logger.step('Block parser process started.');

new Finalizer({ cronProcessId: +program.cronProcessId }).perform();
