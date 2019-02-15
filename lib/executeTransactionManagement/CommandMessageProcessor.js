'use strict';

/**
 *  This module takes some specific actions after receiving the command messages.
 *
 * @module lib/executeTransactionManagement/CommandMessageProcessor
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  commandMessageConstants = require(rootPrefix + '/lib/globalConstant/commandMessage'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetails'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  tokenExtxWorkerProcessesConstants = require(rootPrefix + '/lib/globalConstant/tokenExtxWorkerProcesses');

/**
 * Class to process the command messages depending upon their kind.
 *
 * @class
 */
class CommandMessageProcessor {
  /**
   * @param {Object} params
   * @param {Integer} params.auxChainId - aux ChainId
   * @param {Object} params.commandMessage - payload of the rmq message
   *                  {tokenExtxWorkerProcessesId:"1",tokenId:"1001",commandKind:"goOnHold"
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.commandMessage = params.commandMessage;
    oThis.responseData = {};
    oThis.processIdToQueueSuffixMap = {};
    oThis.openStNotification = null;
  }

  /**
   * Main performer method
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      logger.error(`${__filename}::perform::catch`);
      logger.error(error);
      return responseHelper.error(error);
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    // Get notification object.
    await oThis._getNotificationObject();

    // Get Queue topic suffix for all processIds present on current auxChainId.
    await oThis._getQueueTopicSuffix();

    if (oThis.commandMessage.commandKind === commandMessageConstants.markBlockingToOriginalStatus) {
      await basicHelper.pauseForMilliSeconds(500);
      return oThis._executeMarkBlockingToOriginalStatusCommand();
    } else if (oThis.commandMessage.commandKind === commandMessageConstants.goOnHold) {
      return oThis._executeGoOnHoldCommand();
    } else if (oThis.commandMessage.commandKind === commandMessageConstants.goToOriginal) {
      return oThis._executeGoToOriginalCommand();
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Get notification Object.
   *
   * @returns {Promise<void>}
   */
  async _getNotificationObject() {
    const oThis = this;

    oThis.openStNotification = await rabbitmqProvider.getInstance(rabbitmqConstants.auxRabbitmqKind, {
      auxChainId: oThis.auxChainId,
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });

    logger.step('OpenSt-notification object created.');
  }

  /**
   * Execute command to mark original status of worker process.
   * Also send command to all "Hold" process to check and un-hold self.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _executeMarkBlockingToOriginalStatusCommand() {
    const oThis = this;

    let tokenWorkerDetail = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where({ id: oThis.commandMessage.tokenExtxWorkerProcessesId })
      .fire();

    // Return if the worker does not have "blockingProperty". It checks by bitwise operator.
    if (
      !(
        tokenWorkerDetail[0].properties &
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
      )
    ) {
      return responseHelper.successWithData({});
    }

    // Unset the blocking property
    await new TokenExtxWorkerProcessesModel()
      .update([
        'properties = properties ^ ?',
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
      ])
      .where([
        'id = ? AND properties = properties | ?',
        oThis.commandMessage.tokenExtxWorkerProcessesId,
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
      ])
      .fire();

    // Send "goToOriginal" command to workers having "holdStatus" status of given client.
    let siblingHoldWorkerProcesses = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where([
        'token_id=? AND properties = properties | ?',
        tokenWorkerDetail[0].token_id,
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
      ])
      .fire();

    for (let i = 0; i < siblingHoldWorkerProcesses.length; i++) {
      let workerProcess = siblingHoldWorkerProcesses[i],
        queueNameSuffix = oThis.processIdToQueueSuffixMap[workerProcess.tx_cron_process_detail_id],
        payload = {
          tokenExtxWorkerProcessesId: workerProcess.id,
          tokenId: workerProcess.token_id,
          commandKind: commandMessageConstants.goToOriginal
        },
        message = {
          kind: kwcConstant.commandMsg,
          payload: payload
        },
        topicName = kwcConstant.commandMessageTopicName(oThis.auxChainId, queueNameSuffix);

      let commandThroughRMQ = await oThis.openStNotification.publishEvent
        .perform({
          topics: [topicName],
          publisher: 'OST1',
          message: message
        })
        .catch(function(err) {
          logger.error('Message for command message processor was not published. Payload: ', payload, ' Error: ', err);
        });
      logger.info('Publishing command to hold the queue ', commandThroughRMQ);
    }

    // Do Nothing with any of queue consumers.
    return responseHelper.successWithData({});
  }

  /**
   * Execute command to mark worker process to go to "Hold", means stop txExecuteQueue consumption.
   * Before proceed first check any of sibling worker has blockingProperty.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _executeGoOnHoldCommand() {
    const oThis = this;

    let tokenWorkerDetail = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where({ id: oThis.commandMessage.tokenExtxWorkerProcessesId })
      .fire();

    // return if the worker process has "onHoldProperty"
    if (
      tokenWorkerDetail[0].properties &
      tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
    ) {
      return responseHelper.successWithData({});
    }

    let siblingBlockingWorkerProcesses = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where([
        'token_id = ? AND properties = properties | ?',
        tokenWorkerDetail[0].token_id,
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
      ])
      .fire();

    // If any of sibling worker of the client has 'blockingProperty',
    // Set property to 'onHoldProperty' and Stop consumption of the respective txQueue.
    if (siblingBlockingWorkerProcesses.length > 0) {
      await new TokenExtxWorkerProcessesModel()
        .update([
          'properties = properties | ?',
          tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
        ])
        .where({ id: oThis.commandMessage.tokenExtxWorkerProcessesId })
        .fire();

      return responseHelper.successWithData({ shouldStopTxQueConsume: 1 });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Execute command to mark worker process to release from "Hold", means start txExecuteQueue consumption.
   * Before proceed first check any of sibling worker does not have "blockingProperty".
   *
   * @returns {Promise<*>}
   * @private
   */
  async _executeGoToOriginalCommand() {
    const oThis = this;

    let tokenWorkerDetail = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where({ id: oThis.commandMessage.tokenExtxWorkerProcessesId })
      .fire();

    // return if the worker process does not have "onHoldProperty"
    if (
      !(
        tokenWorkerDetail[0].properties &
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
      )
    ) {
      return responseHelper.successWithData({});
    }

    let siblingBlockingWorkerProcesses = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where([
        'token_id =? AND properties = properties | ?',
        tokenWorkerDetail[0].token_id,
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
      ])
      .fire();

    // return if any of sibling worker of the client still has 'blockingProperty'. In such case can not mark un-hold.
    // unless all blocking workers are resolved.
    if (siblingBlockingWorkerProcesses.length > 0) {
      return Promise.resolve(responseHelper.successWithData({}));
    }

    // Unset the 'onHoldProperty', if Property has 'onHold' bit.
    await new TokenExtxWorkerProcessesModel()
      .update([
        'properties = properties ^ ?',
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
      ])
      .where([
        'id = ? AND properties = properties | ?',
        oThis.commandMessage.tokenExtxWorkerProcessesId,
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
      ])
      .fire();

    // Start consumption of the respective txQueue.
    return Promise.resolve(responseHelper.successWithData({ shouldStartTxQueConsume: 1 }));
  }

  /**
   * Get queue topic suffix for all the processIds of current chain.
   *
   * @returns {Promise<void>}
   */
  async _getQueueTopicSuffix() {
    const oThis = this;
    logger.log('oThis.auxChainId', oThis.auxChainId);
    let response = await new TxCronProcessDetailsModel()
      .select('*')
      .where(['chain_id = ?', oThis.auxChainId])
      .fire();

    for (let index = 0; index < response.length; index++) {
      let dbRow = response[index];
      oThis.processIdToQueueSuffixMap[dbRow.id] = dbRow.queue_topic_suffix;
    }
  }
}

module.exports = CommandMessageProcessor;
