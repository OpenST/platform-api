'use strict';
/**
 * This cache fetches block timestamp for current block on auxiliary chain. Extends base cache.
 *
 * @module lib/cacheManagement/chain/BlockTimeDetails
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class BlockTimeDetails extends BaseCacheManagement {
  /**
   * Constructor for block time details cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * set cache key
   *
   * @return {String}
   */
  _setCacheKey() {
    const oThis = this;

    oThis.chainId = oThis.ic().configStrategy.auxGeth.chainId;

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'c_c_b_t_d_' + oThis.chainId.toString();

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 60; // 1 minute;

    return oThis.cacheExpiry;
  }

  /**
   * Set aux web3 instance
   *
   * @sets oThis.auxWeb3
   *
   * @private
   */
  _setAuxWeb3Instance() {
    const oThis = this,
      wsProvider = oThis.ic().configStrategy.auxGeth.readOnly.wsProvider;

    oThis.auxWeb3 = web3Provider.getInstance(wsProvider).web3WsProvider;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    oThis._setAuxWeb3Instance();

    let blockDetail = await oThis.auxWeb3.eth.getBlock('latest'),
      blockGenerationTime = oThis.ic().configStrategy.auxGeth.blockGenerationTime,
      createdTimestamp = Math.floor(blockDetail.timestamp);

    let dataToCache = {
      block: blockDetail.number,
      createdTimestamp: createdTimestamp,
      blockGenerationTime: blockGenerationTime
    };

    return responseHelper.successWithData(dataToCache);
  }
}

InstanceComposer.registerAsShadowableClass(BlockTimeDetails, coreConstants.icNameSpace, 'BlockTimeDetailsCache');

module.exports = {};
