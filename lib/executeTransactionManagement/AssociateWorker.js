'use strict';

/**
 * Associate ExTxWorker to processId.
 *
 * @module lib/executeTransactionManagement/associateWorker
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
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  commandMessageConstants = require(rootPrefix + '/lib/globalConstant/commandMessage'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  FundExTxWorker = require(rootPrefix + '/lib/executeTransactionManagement/FundExTxWorker'),
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetail'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  tokenExtxWorkerProcessesConstants = require(rootPrefix + '/lib/globalConstant/tokenExtxWorkerProcesses');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/TokenExTxProcess');

class AssociateWorker {
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

    oThis.txCronProcessDetailsIds = [];
    oThis.ostNotification = null;
    oThis.availableExTxWorkersId = [];
    oThis.cronProcessIdsToDetailsMap = {};
    oThis.siblingProcessIdsMap = {};
    oThis.associatedProcessIds = [];
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

    await oThis._fundExTxWorkers();

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

    oThis.ostNotification = await rabbitmqProvider.getInstance(rabbitmqConstant.auxRabbitmqKind, {
      auxChainId: oThis.auxChainId,
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });

    logger.step('OpenST-notification object created.');
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
      cronChainAllProcessIdsToDetailsMap = {};

    let currentChainProcessDetail = await new TxCronProcessDetailsModel()
      .select('*')
      .where(['chain_id = ?', oThis.auxChainId])
      .fire();

    for (let i = 0; i < currentChainProcessDetail.length; i++) {
      let dbRow = currentChainProcessDetail[i];
      cronChainAllProcessIdsToDetailsMap[dbRow.cron_process_id] = dbRow;
    }

    for (let i = 0; i < oThis.cronProcessIds.length; i++) {
      let cron_process_id = oThis.cronProcessIds[i],
        cronProcessDetail = cronChainAllProcessIdsToDetailsMap[cron_process_id];
      if (!cronProcessDetail) {
        return Promise.reject('Cron Process Id ' + cron_process_id + ' passed is invalid');
      }
      oThis.cronProcessIdsToDetailsMap[cronProcessDetail.id] = cronProcessDetail;
      oThis.txCronProcessDetailsIds.push(cronProcessDetail.id);
    }
    logger.info(
      'Valid processIds are after filtering processIds for current chain are : ',
      oThis.txCronProcessDetailsIds
    );
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
    const oThis = this;

    let dbRows = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where(['token_id = ?', oThis.tokenId])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i];

      if (!dbRow.tx_cron_process_detail_id) {
        if (
          !(
            dbRow.properties &
            tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
          ) &&
          !(
            dbRow.properties &
            tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
          )
        ) {
          oThis.availableExTxWorkersId.push({
            tokenExtxWorkerProcessesId: dbRow.id,
            tokenAddressId: dbRow.token_address_id
          });
        }
      } else {
        oThis.siblingProcessIdsMap[dbRow.tx_cron_process_detail_id] = dbRow;

        oThis.associatedProcessIds.push(dbRow.tx_cron_process_detail_id);
      }
    }

    // Here, remove the processIds if they are already associated with given ClientId.
    // Here we are taking difference of processIds and associatedProcessIds.
    let unusedTxCronProcessDetailsIds = [];
    for (let i = 0; i < oThis.txCronProcessDetailsIds.length; i++) {
      let txDId = oThis.txCronProcessDetailsIds[i];
      if (!oThis.siblingProcessIdsMap[txDId]) {
        unusedTxCronProcessDetailsIds.push(txDId);
      }
    }
    oThis.txCronProcessDetailsIds = unusedTxCronProcessDetailsIds;

    if (oThis.txCronProcessDetailsIds.length == 0) {
      logger.info('There are no valid process ids: ', oThis.txCronProcessDetailsIds);
      process.exit(1);
    }
    logger.info('Valid processIds are : ', oThis.txCronProcessDetailsIds);
  }

  /**
   * Fund selected extx workers.
   *
   * @returns {Promise}
   * @private
   */
  async _fundExTxWorkers() {
    const oThis = this,
      noOfWorkersToBeAssociated = Math.min(oThis.txCronProcessDetailsIds.length, oThis.availableExTxWorkersId.length);

    let tokenAddressesId = [],
      exTxWorkerAddresses = [];
    for (let i = 0; i < noOfWorkersToBeAssociated; i++) {
      tokenAddressesId.push(oThis.availableExTxWorkersId[i]['tokenAddressId']);
    }

    logger.debug('===== tokenAddressesId =====', tokenAddressesId);
    let tokenAddressesResponse = await new TokenAddressModel()
      .select('address')
      .where(['id IN (?)', tokenAddressesId])
      .fire();

    for (let i = 0; i < tokenAddressesResponse.length; i++) {
      exTxWorkerAddresses.push(tokenAddressesResponse[i]['address']);
    }

    let fundExTxWorkerObj = new FundExTxWorker({
        tokenId: oThis.tokenId,
        chainId: oThis.auxChainId,
        exTxWorkerAddresses: exTxWorkerAddresses
      }),
      fundResponse = await fundExTxWorkerObj.perform();

    logger.debug('===== fundResponse =====', fundResponse);
    if (fundResponse.isFailure()) {
      return Promise.reject(fundResponse);
    }

    return true;
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
      .where(['token_id=(?) AND tx_cron_process_detail_id IS NOT NULL', oThis.tokenId])
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
      noOfWorkersToBeAssociated = Math.min(oThis.txCronProcessDetailsIds.length, oThis.availableExTxWorkersId.length);

    for (let index = 0; index < noOfWorkersToBeAssociated; index++) {
      let processId = oThis.txCronProcessDetailsIds[index],
        processDetails = oThis.cronProcessIdsToDetailsMap[processId];

      await new TokenExtxWorkerProcessesModel()
        .update(['tx_cron_process_detail_id = ?', processId])
        .where(['id=(?)', oThis.availableExTxWorkersId[index]['tokenExtxWorkerProcessesId']])
        .fire();

      let topicName = kwcConstant.exTxTopicName(processDetails.chain_id, processDetails.queue_topic_suffix);

      // Prepare message to be sent to transaction executing queues of kind goOnHold.
      const payload = {
        tokenExtxWorkerProcessesId: oThis.availableExTxWorkersId[index]['tokenExtxWorkerProcessesId'],
        tokenId: oThis.tokenId,
        commandKind: commandMessageConstants.goOnHold
      };

      const message = { kind: kwcConstant.commandMsg, payload: payload };

      logger.debug('==== Message payload =====', message);
      logger.debug('==== topicName ====', topicName);

      // Publish the message to the transaction executing queues.
      await oThis.ostNotification.publishEvent
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
    const oThis = this;

    // Here chainId is passed to make sure that the processIds are of current chain only.
    let associatedTxCronProcessDetails = await new TxCronProcessDetailsModel()
      .select('*')
      .where(['id IN (?)', oThis.associatedProcessIds])
      .fire();

    for (let index = 0; index < associatedTxCronProcessDetails.length; index++) {
      let dbRow = associatedTxCronProcessDetails[index],
        txCronProcessDetailId = dbRow.id,
        workerDetails = oThis.siblingProcessIdsMap[txCronProcessDetailId];

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
      await oThis.ostNotification.publishEvent
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
