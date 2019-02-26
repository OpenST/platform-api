'use strict';
/**
 * This service helps in fetching transaction
 *
 * @module app/services/transaction/GetTransaction
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  ESTransactionService = esServices.services.transactions,
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  GetTransactionDetails = require(rootPrefix + '/lib/transactions/GetTransactionDetails');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/transactions/GetTransactionDetails');

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
    oThis.userId = params.user_id;
    oThis.transactionId = params.transaction_id;

    oThis.configStrategyObj = null;
    oThis.auxChainId = null;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    const GetTransactionDetails = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetails'),
      serviceConfig = oThis.getServiceConfig(),
      service = new ESTransactionService(serviceConfig),
      esQuery = oThis.getQueryObject();

    let transactionDetails = await service.search(esQuery);

    if (transactionDetails.isSuccess() && transactionDetails.data[oThis.auxChainId + '_transactions'].length !== 0) {
      let response = await new GetTransactionDetails({
        chainId: oThis.auxChainId,
        esSearchData: transactionDetails
      }).perform();
      return responseHelper.successWithData({ [resultType.transaction]: response.data[oThis.transactionId] });
    } else {
      let response = await new GetTransactionDetails({
        chainId: oThis.auxChainId,
        esSearchData: transactionDetails,
        pendingTransactionUuids: [oThis.transactionId]
      }).perform();
      return responseHelper.successWithData({ [resultType.transaction]: response.data[oThis.transactionId] });

      // return responseHelper.error({
      //   internal_error_identifier: 'a_s_t_gt_1',
      //   api_error_identifier: 'es_data_not_found',
      //   debug_options: { esData: transactionDetails }
      // });
    }
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
      esConfig = configStrategy.elasticSearchConfig,
      elasticSearchKey = configStrategyConstants.elasticSearch;

    oThis.auxChainId = configStrategy.auxChainId;

    let finalConfig = {
      chainId: oThis.auxChainId
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
          _id: [oThis.transactionId]
        }
      }
    };
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
