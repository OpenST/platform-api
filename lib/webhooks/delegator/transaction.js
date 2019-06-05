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
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
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
      if (transactionDetails.length === 0) {
        await basicHelper.sleep(sleepTimeInMs);
        transactionDetails = await oThis._fetchData(esConfig, ic, payload);
      } else {
        break;
      }
    }

    return transactionDetails[0];
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

    // This condition is to ensure that extra query on Dyanmo is not made.
    if (esSearchResponse.data.meta.total_records === 0) {
      return [];
    }

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
      const errorObject = responseHelper.error({
        internal_error_identifier: 'elastic_search_service_down:l_w_d_t_2',
        api_error_identifier: 'elastic_search_service_down',
        debug_options: {}
      });
      await createErrorLogsEntry.perform(errorObject, errorLogsConstants.highSeverity);

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_t_2',
          api_error_identifier: 'elastic_search_service_down',
          debug_options: {}
        })
      );
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
    const GetTransactionDetails = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetails'),
      transactionsResponse = await new GetTransactionDetails({
        chainId: ic.configStrategy.auxGeth.chainId,
        tokenId: payload.tokenId,
        esSearchResponse: esSearchResponse
      }).perform();

    return transactionsResponse.data;
  }
}

module.exports = new Transaction();
