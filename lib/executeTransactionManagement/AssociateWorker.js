'use strict';

/**
 * Associate ExTxWorker to processId.
 *
 * @module lib/executeTransactionManagement/associateWorker
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitMqProvider = require(rootPrefix + '/lib/providers/notification'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  commandMessageConstants = require(rootPrefix + '/lib/globalConstant/commandMessage'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetails'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  tokenExtxWorkerProcessesConstants = require(rootPrefix + '/lib/globalConstant/tokenExtxWorkerProcesses');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/TokenExTxProcess');

class AssociateWorker {
  /**
   *
   * @param {Object} params
   * @param {Integer} params.tokenId
   * @param {Array} params.cronProcessId
   *
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.cronProcessId = params.cronProcessId;

    oThis.txCronProcessDetailsId = [];
    oThis.openStNotification = null;
    oThis.availableExTxWorkersId = [];
    oThis.cronProcessIdsToDetailsMap = {};
    oThis.siblingProcessIdsMap = {};
    oThis.associatedProcessIds = new Set();
  }

  /**
   * Main Performer method.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_etm_aw_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: error.toString()
        });
      }
    });
  }

  /**
   * Async Performer.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis.auxChainId = oThis._configStrategyObject.auxChainId;

    await oThis._getNotificationObject();

    await oThis._getAndValidateProcessDetails();

    await oThis._getAndValidateAvailableWorkers();

    await oThis._markBlockingStatus();

    await oThis._associateAvailableWorker();

    await oThis._sendBlockingMessage();

    await oThis._clearCache();
  }

  /**
   * Get notification Object.
   *
   * @returns {Promise<void>}
   */
  async _getNotificationObject() {
    const oThis = this;

    oThis.openStNotification = await rabbitMqProvider.getInstance({
      chainId: oThis.auxChainId,
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });

    logger.step('OpenSt-notification object created.');
  }

  /**
   * Get available workers for the tokenId, i.e. workers which are not associated with any process.
   * It also validates the processes that are being passed.
   * i.e. It removes the processes if those are already associated.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getAndValidateAvailableWorkers() {
    const oThis = this,
      tokenExtxWorkerProcessesObject = new TokenExtxWorkerProcessesModel();

    let dbRows = await tokenExtxWorkerProcessesObject
      .select('*')
      .where(['token_id = ?', oThis.tokenId])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i];

      if (!dbRow.tx_cron_process_detail_id) {
        if (
          !(
            dbRow.properties &&
            tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
          ) &&
          !(
            dbRow.properties &&
            tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
          )
        ) {
          oThis.availableExTxWorkersId.push(dbRow.id);
        }
      } else {
        oThis.siblingProcessIdsMap[dbRow.tx_cron_process_detail_id] =
          oThis.siblingProcessIdsMap[dbRow.tx_cron_process_detail_id] || [];
        oThis.siblingProcessIdsMap[dbRow.tx_cron_process_detail_id].push(dbRow);

        oThis.associatedProcessIds.add(dbRow.tx_cron_process_detail_id);
      }
    }

    // Here, remove the processIds if they are already associated with given ClientId.
    // Here we are taking difference of processIds and associatedProcessIds.
    oThis.txCronProcessDetailsId = [
      ...new Set(oThis.txCronProcessDetailsId.filter((x) => !oThis.associatedProcessIds.has(x)))
    ];

    if (oThis.txCronProcessDetailsId.length == 0) {
      logger.info('There are no valid process ids: ', oThis.txCronProcessDetailsId);
      process.exit(1);
    }
    logger.info('Valid processIds are : ', oThis.txCronProcessDetailsId);
  }

  /**
   * Fetch process details for all the processes of current auxChainId.
   * and apply validations for processIds being passed.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getAndValidateProcessDetails() {
    const oThis = this,
      chainIdsOnCurrentChain = new Set(),
      txCronProcessDetailsObject = new TxCronProcessDetailsModel();

    let dbRows = await txCronProcessDetailsObject
      .select('*')
      .where(['cron_process_id IN (?)', oThis.cronProcessId])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i];
      oThis.cronProcessIdsToDetailsMap[dbRow.id] = dbRow;
      oThis.txCronProcessDetailsId.push(dbRow.id);
    }
    logger.debug('====== txCronProcessDetailsId =====', oThis.txCronProcessDetailsId);
    // Here chainId is passed to make sure that the processIds are of current chain only.
    let txCronProcessDetailsObj = new TxCronProcessDetailsModel(),
      currentChainProcessDetail = await txCronProcessDetailsObj
        .select('*')
        .where(['chain_id = ?', oThis.auxChainId])
        .fire();

    for (let i = 0; i < currentChainProcessDetail.length; i++) {
      let dbRow = currentChainProcessDetail[i];
      console.log('dbRow.id', dbRow.id);
      chainIdsOnCurrentChain.add(dbRow.id);
    }
    logger.debug('Chain Ids On Current Chain', chainIdsOnCurrentChain);

    // The processIds that are passed as an input parameters should be the valid ones.
    // i.e. They must lie on the same chain as that of the tokenId.
    // Here we are taking intersection of processIds and chainIdsOnCurrentChain.
    oThis.txCronProcessDetailsId = [
      ...new Set(oThis.txCronProcessDetailsId.filter((x) => chainIdsOnCurrentChain.has(x)))
    ];

    logger.info(
      'Valid processIds are after filtering processIds for current chain are : ',
      oThis.txCronProcessDetailsId
    );
  }

  /**
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }

  /**
   * Updates the status of active workers to blocking.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _markBlockingStatus() {
    const oThis = this;

    // Mark all currently running workers as blocking for given client.
    await new TokenExtxWorkerProcessesModel()
      .update([
        'properties = properties | ?',
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
      ])
      .where([
        'token_id=(?) AND tx_cron_process_detail_id IS NOT NULL AND tx_cron_process_detail_id NOT IN (?)',
        oThis.tokenId,
        oThis.txCronProcessDetailsId
      ])
      .fire();

    logger.step('Running workers marked as blocking in the DB.');
  }

  /**
   * Associate available workers of clients to the passed processId.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _associateAvailableWorker() {
    const oThis = this,
      noOfWorkersToBeAssociated = Math.min(oThis.txCronProcessDetailsId.length, oThis.availableExTxWorkersId.length);

    for (let index = 0; index < noOfWorkersToBeAssociated; index++) {
      let processId = oThis.txCronProcessDetailsId[index],
        processDetails = oThis.cronProcessIdsToDetailsMap[processId];

      await new TokenExtxWorkerProcessesModel()
        .update(['tx_cron_process_detail_id = ?', processId])
        .where(['id=(?)', oThis.availableExTxWorkersId[index]])
        .fire();

      let topicName = kwcConstant.exTxTopicName(processDetails.chain_id, processDetails.queue_topic_suffix);

      // Prepare message to be sent to transaction executing queues of kind goOnHold.
      const payload = {
        tokenExtxWorkerProcessesId: oThis.availableExTxWorkersId[index],
        tokenId: oThis.tokenId,
        commandKind: commandMessageConstants.goOnHold
      };

      const message = { kind: kwcConstant.commandMsg, payload: payload };

      logger.debug('==== Message payload =====', message);
      logger.debug('==== topicName ====', topicName);

      // Publish the message to the transaction executing queues.
      await oThis.openStNotification.publishEvent
        .perform({
          topics: [topicName],
          publisher: 'OST1',
          message: message
        })
        .catch(function(err) {
          logger.error(
            'Message for associating worker on transaction executing queues was not published. Payload: ',
            payload,
            ' Error: ',
            err
          );
        });

      logger.step('Process association messages sent.');
    }
  }

  /**
   * Send blocking messages to all the active workers for the client.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendBlockingMessage() {
    const oThis = this,
      txCronProcessDetailsObject = new TxCronProcessDetailsModel();

    // Here chainId is passed to make sure that the processIds are of current chain only.
    let dbRows = await txCronProcessDetailsObject
      .select('*')
      .where(['id IN (?)', [...oThis.associatedProcessIds]])
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      let dbRow = dbRows[index],
        txCronProcessDetailId = dbRow.id,
        workerDetails = oThis.siblingProcessIdsMap[txCronProcessDetailId][0];

      let topicName = kwcConstant.exTxTopicName(dbRow.chain_id, dbRow.queue_topic_suffix);

      // Prepare message to be sent to transaction executing queues of kind markBlockingToOriginalStatus.
      // client_worker_managed_id is the table id.
      const payload = {
        tokenExtxWorkerProcessesId: workerDetails.id,
        tokenId: workerDetails.token_id,
        commandKind: commandMessageConstants.markBlockingToOriginalStatus
      };

      const message = { kind: kwcConstant.commandMsg, payload: payload };

      logger.debug('==== Message payload =====', message);
      logger.debug('==== topicName ====', topicName);

      // Publish the message to command_message(Distributor Queue Consumer) queue.
      await oThis.openStNotification.publishEvent
        .perform({
          topics: [topicName],
          publisher: 'OST1',
          message: message
        })
        .catch(function(err) {
          logger.error(
            'Message for associating worker on command_message queue was not published. Payload: ',
            payload,
            ' Error: ',
            err
          );
        });
    }
  }

  /**
   * Clear cache.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearCache() {
    const oThis = this,
      TokenExTxProcessCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenExTxProcessCache');

    await new TokenExTxProcessCache({ tokenId: oThis.tokenId }).clear();
  }
}

InstanceComposer.registerAsShadowableClass(AssociateWorker, coreConstants.icNameSpace, 'AssociateWorker');

module.exports = {};
