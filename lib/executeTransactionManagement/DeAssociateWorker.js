'use strict';

/**
 * To de-associate process from tokenExTxWorkerProcesses table.
 *
 * @module lib/executeTransactionManagement/DeAssociateWorker
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  commandMessageConstants = require(rootPrefix + '/lib/globalConstant/commandMessage'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  TxCronProcessDetailsModel = require(rootPrefix + '//app/models/mysql/TxCronProcessDetail'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  tokenExtxWorkerProcessesConstants = require(rootPrefix + '/lib/globalConstant/tokenExtxWorkerProcesses');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/TokenExTxProcess');

class DeAssociateWorker {
  /**
   *
   * @param {Object} params
   * @param {Integer} params.tokenId
   * @param {Array} params.cronProcessIds
   *
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.cronProcessIds = params.cronProcessIds;

    oThis.txCronProcessDetailsId = [];
    oThis.activeWorkersToDetailsMap = {};
    oThis.ostNotification = null;
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
          internal_error_identifier: 'l_etm_daw_1',
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

    await oThis._getTxCronProcessDetailsId();

    await oThis._validateWorkerProcessAssociation();

    await oThis._removeProcessWorkerAssociation();

    await oThis._sendBlockingToOriginalCommand();

    await oThis._sendGoOnHoldCommand();

    await oThis._clearCache();
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
   * Get cron process Details id
   *
   * @private
   */
  async _getTxCronProcessDetailsId() {
    const oThis = this,
      cronProcessDetailsId = await new TxCronProcessDetailsModel()
        .select('id')
        .where(['cron_process_id IN (?)', oThis.cronProcessIds])
        .fire();

    for (let i = 0; i < cronProcessDetailsId.length; i++) {
      oThis.txCronProcessDetailsId.push(parseInt(cronProcessDetailsId[i].id));
    }
    logger.debug('==== oThis.txCronProcessDetailsId====', oThis.txCronProcessDetailsId);
  }

  /**
   * Get notification Object.
   *
   * @returns {Promise<void>}
   */
  async _getNotificationObject() {
    const oThis = this;

    oThis.ostNotification = await rabbitmqProvider.getInstance(rabbitmqConstant.auxRabbitmqKind, {
      auxChainId: oThis.auxChainId,
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });

    logger.step('OpenST-notification object created.');
  }

  /**
   * Validate workers to process association. To make sure if its already present or not.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateWorkerProcessAssociation() {
    const oThis = this;

    let tokenExTxProcessResponse = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where(['token_id =? AND tx_cron_process_detail_id IN (?)', oThis.tokenId, oThis.txCronProcessDetailsId])
      .fire();

    let associatedProcessIds = new Set(),
      processIds = new Set(oThis.txCronProcessDetailsId);

    for (let i = 0; i < tokenExTxProcessResponse.length; i++) {
      let dbRow = tokenExTxProcessResponse[i];
      associatedProcessIds.add(dbRow.tx_cron_process_detail_id);

      oThis.activeWorkersToDetailsMap[dbRow.tx_cron_process_detail_id] = dbRow;
    }

    // Here we make sure that processIds from input must be already associated. If not we cant consider that.
    // Final processIds array will contain intersection of two sets
    // i.e. The ones that are already associated and input processIds.
    oThis.txCronProcessDetailsId = [...new Set([...associatedProcessIds].filter((x) => processIds.has(x)))];
  }

  /**
   * Remove the process worker association in TokenExtxWorkerProcesses table and set property to blocking.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _removeProcessWorkerAssociation() {
    const oThis = this,
      blockingProperty =
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty];

    // Remove worker association and update status to blocking.
    await new TokenExtxWorkerProcessesModel()
      .update(['tx_cron_process_detail_id = ?, properties = properties | ?', null, blockingProperty])
      .where(['tx_cron_process_detail_id IN (?) AND token_id = ?', oThis.txCronProcessDetailsId, oThis.tokenId])
      .fire();

    logger.step('Removed worker association entry from the DB.');
  }

  /**
   * Mark the workers that needs to be de-associated blocking and
   * send command message to there respective queues.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendBlockingToOriginalCommand() {
    const oThis = this;

    let cronProcessesResponse = await new TxCronProcessDetailsModel()
      .select('*')
      .where(['id IN (?)', oThis.txCronProcessDetailsId])
      .fire();

    // Mark the current worker (the one we want to de-associate) Blocking and send the command message
    // on its execute transaction queue
    for (let i = 0; i < cronProcessesResponse.length; i++) {
      let processId = cronProcessesResponse[i].id,
        queueTopicSuffix = cronProcessesResponse[i].queue_topic_suffix,
        chainId = cronProcessesResponse[i].chain_id,
        workersDetail = oThis.activeWorkersToDetailsMap[processId];

      // client_worker_managed_id is the table id.
      let payload = {
          tokenExtxWorkerProcessesId: workersDetail.id,
          tokenId: oThis.tokenId,
          commandKind: commandMessageConstants.markBlockingToOriginalStatus
        },
        queueTopic = kwcConstant.exTxTopicName(chainId, queueTopicSuffix),
        message = {
          kind: kwcConstant.commandMsg,
          payload: payload
        };

      logger.debug('==== Message payload =====', message);
      logger.debug('==== queueTopic ====', queueTopic);

      // Publish the message.
      let commandThroughRMQ = await oThis.ostNotification.publishEvent
        .perform({
          topics: [queueTopic],
          publisher: 'OST_1',
          message: message
        })
        .catch(function(err) {
          logger.error(
            'Message for dissociating worker of kind markBlockingToOriginalStatus was not published. Payload: ',
            payload,
            ' Error: ',
            err
          );
        });
      logger.info('Publishing command to the queue ', commandThroughRMQ);
    }

    logger.step('All messages of type markBlockingToOriginalStatus sent.');
  }

  /**
   * Send the command message OnHold to sibling workers.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendGoOnHoldCommand() {
    const oThis = this;

    // Get worker details of sibling workers.
    let workerDetails = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where(['token_id = ? AND tx_cron_process_detail_id IS NOT NULL', oThis.tokenId])
      .fire();

    for (let i = 0; i < workerDetails.length; i++) {
      let currentRecord = workerDetails[i],
        currentProcessId = currentRecord.tx_cron_process_detail_id,
        processDetails = await new TxCronProcessDetailsModel()
          .select('queue_topic_suffix, chain_id')
          .where(['id = ?', currentProcessId])
          .fire();

      // Send command messages to the sibling workers execute transaction queues to goOnHold.
      // client_worker_managed_id is the table id.
      let payload = {
          tokenExtxWorkerProcessesId: currentRecord.id,
          tokenId: currentRecord.token_id,
          commandKind: commandMessageConstants.goOnHold
        },
        topicName = kwcConstant + processDetails[0].chain_id + '.' + processDetails[0].queue_topic_suffix,
        message = { kind: kwcConstant.commandMsg, payload: payload };

      logger.debug('==== Message payload =====', message);
      logger.debug('==== queueTopic ====', topicName);

      await oThis.ostNotification.publishEvent
        .perform({
          topics: [topicName],
          publisher: 'OST_1',
          message: message
        })
        .catch(function(err) {
          logger.error(
            'Message for dissociating worker of kind goOnHold was not published. Payload: ',
            payload,
            ' Error: ',
            err
          );
        });
    }
    logger.step('All messages of type goOnHold sent.');
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

InstanceComposer.registerAsShadowableClass(DeAssociateWorker, coreConstants.icNameSpace, 'DeAssociateWorker');

module.exports = {};
