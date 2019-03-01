'use strict';
/**
 * This service helps in fetching transaction
 *
 * @module app/services/transaction/get/Transaction
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Get transaction base class
 *
 * @class
 */
class GetTransactionBase extends ServiceBase {
  /**
   *
   * @param {Object} params
   * @param {Integer} params.user_id
   * @param {Integer} params.client_id
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.userId = params.user_id;
    oThis.clientId = params.client_id;

    oThis.tokenId = null;
    oThis.configStrategyObj = null;
    oThis.auxChainId = null;
  }

  /**
   * Get service config
   *
   * Eg finalConfig = {
   *             "chainId": 123, //Aux chainId
   *             "elasticSearch": {
   *               "host":"localhost:9200",
   *               "region":"localhost",
   *               "apiKey":"elastic",
   *               "apiSecret":"changeme",
   *               "apiVersion":"6.2"
   *               }
   *            }
   * @returns {*}
   * @private
   */
  _getServiceConfig() {
    const oThis = this;

    let configStrategy = oThis._configStrategyObject,
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
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _fetchUserFromCache() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    let instanceComposer = new InstanceComposer(oThis._configStrategy);

    let TokenUserDetailsCache = instanceComposer.getShadowedClassFor(
        coreConstants.icNameSpace,
        'TokenUserDetailsCache'
      ),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] });

    return tokenUserDetailsCacheObj.fetch();
  }
}

module.exports = GetTransactionBase;
