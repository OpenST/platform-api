'use strict';
/**
 * This service helps in fetching transaction for a user
 *
 * @module app/services/transaction/GetTransaction
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  ESTransactionService = esServices.services.transactions;

/**
 * Class to Get transaction
 *
 * @class
 */
class GetTransaction extends ServiceBase {
  /**
   * Constructor for execute transaction
   *
   * @param params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.user_id = params.user_id;
    oThis.transaction_id = params.transaction_id;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateParams();

    const serviceConfig = oThis.getServiceConfig(),
      service = new ESTransactionService(serviceConfig),
      esQuery = oThis.getQueryObject();

    let transactionDetails = await service.search(esQuery);

    let responseData = transactionDetails; // TODO get from Dynamo

    return responseHelper.successWithData(responseData);
  }

  /**
   * getServiceConfig
   *
   * @return Object <Service config>
   *
   * Eg finalConfig = {
   *             "chainId": 123, //Aux chainId
   *             "elasticSearch": {
   *               "host":"localhost:9200",
   *               "region":"localhost",
   *               "apiKey":"elastic",
   *               "apiSecret":"changeme",
   *               "apiVersion":"6.2"
   *             }
   *   }
   **/

  getServiceConfig() {
    const oThis = this,
      configStrategy = oThis._configStrategyObject,
      chainId = configStrategy.auxChainId,
      esConfig = configStrategy.elasticSearchConfig,
      elasticSearchKey = configStrategyConstants.elasticSearch;

    let finalConfig = {
      chainId: chainId
    };

    finalConfig[elasticSearchKey] = esConfig;

    return finalConfig;
  }

  /***
   *getQueryObject
   * @return {{query: {terms: {_id: *[]}}}}
   */

  getQueryObject() {
    const oThis = this;
    return {
      query: {
        terms: {
          _id: [oThis.transaction_id]
        }
      }
    };
  }

  /**
   * Validate Specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateParams() {
    const oThis = this;

    if (!oThis.transaction_id) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_t_gut_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['missing_transaction_id'],
          debug_options: {}
        })
      );
    }
  }

  /***
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
}

InstanceComposer.registerAsShadowableClass(GetTransaction, coreConstants.icNameSpace, 'GetTransaction');

module.exports = {};
