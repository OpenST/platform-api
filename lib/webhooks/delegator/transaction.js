/**
 * Module to create transaction entity.
 *
 * @module lib/webhooks/delegator/transaction
 */

const rootPrefix = '../../..',
  TransactionFormatter = require(rootPrefix + '/lib/formatter/entity/Transaction'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const ESTransactionService = esServices.services.transactions;

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

    const esSearchResponse = await oThis._searchInEs(esConfig, payload);

    const transactionDetails = await oThis._fetchTxDetails(ic, payload, esSearchResponse);

    return oThis.formatTransactionData(transactionDetails[0]);
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

  /**
   * Format transaction data using transaction entity formatter.
   *
   * @param {object} transactionData
   *
   * @returns {*|result}
   */
  formatTransactionData(transactionData) {
    const transactionFormattedRsp = new TransactionFormatter(transactionData).perform();

    return responseHelper.successWithData({
      result_type: resultType.transaction,
      [resultType.transaction]: transactionFormattedRsp.data
    });
  }
}

module.exports = new Transaction();
