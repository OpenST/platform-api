/**
 * Module to create transaction entity.
 *
 * @module lib/webhooks/delegator/transaction
 */

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Declare variables.
const ESTransactionService = esServices.services.transactions;
const maxRetryCount = 4;
const sleepTimeInMs = 500;

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/transactions/GetTransactionDetails');

/**
 * Class to create transaction entity.
 *
 * @class Transaction
 */
class Transaction {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.tokenId
   * @param {string} payload.transactionUuid
   * @param {object} ic
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload, ic) {
    const oThis = this;

    return oThis._asyncPerform(payload, ic).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/transaction.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_t_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.tokenId
   * @param {string} payload.transactionUuid
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    const esConfig = oThis._setEsConfig(ic);

    let transactionDetails = await oThis._fetchData(esConfig, ic, payload);

    /* This loop is because it takes some time to sync data in ES.
    Hence, we retry 4 times after every 500ms to be sure that we get the data.
    */
    for (let index = 0; index < maxRetryCount; index++) {
      if (transactionDetails.isFailure()) {
        await basicHelper.sleep(sleepTimeInMs);
        transactionDetails = await oThis._fetchData(esConfig, ic, payload);
      } else {
        break;
      }
    }

    return transactionDetails;
  }

  /**
   * Fetch transaction data.
   *
   * @param {object} esConfig
   * @param {object} ic
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.tokenId
   * @param {string} payload.transactionUuid
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchData(esConfig, ic, payload) {
    const oThis = this;

    const esSearchResponse = await oThis._searchInEs(esConfig, payload);

    return oThis._fetchTxDetails(ic, payload, esSearchResponse);
  }

  /**
   * Get config for elastic search.
   *
   * @param {object} ic
   *
   * @returns {{[p: string]: *, chainId: number}}
   * @private
   */
  _setEsConfig(ic) {
    return {
      chainId: ic.configStrategy.auxGeth.chainId,
      [configStrategyConstants.elasticSearch]: ic.configStrategy.elasticSearch
    };
  }

  /**
   * Search in ES.
   *
   * @param {object} esConfig
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.tokenId
   * @param {string} payload.transactionUuid
   *
   * @returns {Promise<*>}
   * @private
   */
  async _searchInEs(esConfig, payload) {
    const oThis = this;

    const esService = new ESTransactionService(esConfig),
      esQuery = oThis._getEsQueryObject(payload);

    const esSearchResponse = await esService.search(esQuery);

    if (esSearchResponse.isFailure()) {
      logger.error('esSearchResponse =======', esSearchResponse);
    }

    logger.debug('User transactions from Elastic search ', esSearchResponse);

    return esSearchResponse;
  }

  /**
   * Get ES query object.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.tokenId
   * @param {string} payload.transactionUuid
   *
   * @returns {{query: {terms: {_id: *[]}}}}
   * @private
   */
  _getEsQueryObject(payload) {
    return {
      query: {
        terms: {
          _id: [payload.transactionUuid]
        }
      }
    };
  }

  /**
   * Fetch tx details.
   *
   * @param {object} ic
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.tokenId
   * @param {string} payload.transactionUuid
   * @param {object} esSearchResponse
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchTxDetails(ic, payload, esSearchResponse) {
    const oThis = this;

    const GetTransactionDetails = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetails'),
      params = {
        chainId: ic.configStrategy.auxGeth.chainId,
        tokenId: payload.tokenId
      };

    if (esSearchResponse.isSuccess() && esSearchResponse.data.meta.total_records !== 0) {
      params.esSearchResponse = esSearchResponse;
    }

    if (payload.transactionUuid) {
      params.txUuids = [payload.transactionUuid];
    }

    const transactionsResponse = await new GetTransactionDetails(params).perform();

    await oThis._validateEntityStatus(payload.webhookKind, transactionsResponse.data[0]);

    return responseHelper.successWithData({
      entityResultType: resultType.transaction,
      rawEntity: transactionsResponse.data[0]
    });
  }

  /**
   * Webhook subscription topic to entity statuses map.
   */
  get WebhookTopicToEntityStatusMap() {
    return {
      [webhookSubscriptionConstants.transactionsInitiateTopic]: [
        pendingTransactionConstants.createdStatus,
        pendingTransactionConstants.submittedStatus
      ],
      [webhookSubscriptionConstants.transactionsFailureTopic]: [pendingTransactionConstants.failedStatus],
      [webhookSubscriptionConstants.transactionsMinedTopic]: [pendingTransactionConstants.minedStatus],
      [webhookSubscriptionConstants.transactionsSuccessTopic]: [pendingTransactionConstants.successStatus]
    };
  }

  /**
   * Validate entity status with respect to webhook to be sent.
   *
   * @param webhookKind
   * @param rawEntity
   * @returns {Promise<*>}
   * @private
   */
  async _validateEntityStatus(webhookKind, rawEntity) {
    const oThis = this;

    if (oThis._filteredEntityToSend(webhookKind, rawEntity)) {
      return rawEntity;
    } else {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_t_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            msg: 'Webhook Kind to send is not in sync with entity data.',
            entityData: rawEntity,
            webhookKind: webhookKind
          }
        })
      );
    }
  }

  /**
   * Filter Entity which can be sent outside.
   *
   * @param webhookKind
   * @param rawEntity
   * @returns {boolean}
   * @private
   */
  _filteredEntityToSend(webhookKind, rawEntity) {
    const oThis = this;

    const allowedEntityStatuses = oThis.WebhookTopicToEntityStatusMap[webhookKind];
    if (allowedEntityStatuses.indexOf(rawEntity.status) <= -1) {
      // Check if entity status is already progressed from desired ones if yes then send webhook
      // eg: 'transactions/initiate' can send Success or Failure status entity,
      // but 'transactions/success' cannot send created status entity.
      if (webhookKind == webhookSubscriptionConstants.transactionsInitiateTopic) {
        // Check if status has progressed
        if (
          [
            pendingTransactionConstants.failedStatus,
            pendingTransactionConstants.minedStatus,
            pendingTransactionConstants.successStatus
          ].indexOf(rawEntity.status) <= -1
        ) {
          return false;
        } else {
          // Entity can be sent, now filter out data which is not allowed to be sent now
          Object.assign(rawEntity, {
            blockNumber: null,
            blockTimestamp: null,
            transactionFee: '0',
            blockConfirmation: 0,
            status: pendingTransactionConstants.submittedStatus
          });
        }
      } else if (webhookKind == webhookSubscriptionConstants.transactionsMinedTopic) {
        if (
          [pendingTransactionConstants.failedStatus, pendingTransactionConstants.successStatus].indexOf(
            rawEntity.status
          ) <= -1
        ) {
          return false;
        } else {
          rawEntity.status = pendingTransactionConstants.minedStatus;
        }
      } else {
        return false;
      }
    }
    return true;
  }
}

module.exports = new Transaction();
