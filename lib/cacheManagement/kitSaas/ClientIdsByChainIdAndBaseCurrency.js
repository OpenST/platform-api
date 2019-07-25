/**
 * Cache for fetching client Ids for a specific chainId and base currency.
 *
 * @module lib/cacheManagement/kitSaas/ClientIdsByChainIdAndBaseCurrency
 */

const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for fetching client Ids for a specific chainId and base currency.
 *
 * @class ClientIdsByChainIdAndBaseCurrency
 */
class ClientIdsByChainIdAndBaseCurrency extends BaseCacheManagement {
  /**
   * Constructor for fetching client Ids for a specific chainId and base currency.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {string} params.chainId
   * @param {string} params.baseCurrency
   * @param {number} params.stakeCurrencyId
   *
   * @augments BaseCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.chainId;
    oThis.baseCurrency = params.baseCurrency;
    oThis.stakeCurrencyId = params.stakeCurrencyId;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided.
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided.
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided.
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level.
   *
   * @sets oThis.cacheLevel
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;

    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache keys.
   *
   * @sets oThis.cacheKeySuffix
   *
   * @private
   */
  _setCacheKeySuffix() {
    const oThis = this;

    oThis.cacheKeySuffix = `ci_ch_bc_${oThis.auxChainId}_${oThis.baseCurrency}`;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry.
   *
   * @sets oThis.cacheExpiry
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 30 * 60; // 30 minutes;
  }

  /**
   * Fetch data from source.
   *
   * @return {Result}
   *
   * @private
   */
  async _fetchDataFromSource() {
    const oThis = this;

    const chainClientIds = await oThis._fetchClientsOnChain();

    const modelResponse = await new TokenModel()
      .select('client_id')
      .where(['client_id IN (?) AND stake_currency_id = (?)', chainClientIds, oThis.stakeCurrencyId])
      .fire();

    const clientIds = [];

    for (let index = 0; index < modelResponse.length; index++) {
      const clientId = modelResponse[index].client_id;

      clientIds.push(clientId);
    }

    return responseHelper.successWithData({ clientIds: clientIds });
  }

  /**
   * Fetch all client ids on specific chain.
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchClientsOnChain() {
    const oThis = this;

    const chainClientIds = await new ClientConfigGroup()
      .select('client_id')
      .where(['chain_id = (?)', oThis.auxChainId])
      .fire();

    const clientIds = [];
    for (let index = 0; index < chainClientIds.length; index++) {
      const clientId = chainClientIds[index].client_id;

      clientIds.push(clientId);
    }

    return clientIds;
  }
}

module.exports = ClientIdsByChainIdAndBaseCurrency;
