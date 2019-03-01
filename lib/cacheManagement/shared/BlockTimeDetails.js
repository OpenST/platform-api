'use strict';
/**
 * This cache fetches block timestamp for current block on auxiliary chain. Extends base cache.
 *
 * @module lib/cacheManagement/chain/BlockTimeDetails
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementSharedBase = require(rootPrefix + '/lib/cacheManagement/shared/Base');

class BlockTimeDetails extends CacheManagementSharedBase {
  /**
   * Constructor for block time details cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param {String/Number} params.chainId
   * @param {Boolean} [params.isOriginChainId]: Defaults to false.
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.chainId = Number(params.chainId);
    oThis.isOriginChainId = params.isOriginChainId || false;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * Set cache key
   *
   * @return {String}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'b_t_d_' + oThis.chainId.toString();

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 60; // 1 minute;

    return oThis.cacheExpiry;
  }

  /**
   * Set origin web3 instance
   *
   * @sets oThis.web3Instance
   *
   * @private
   */
  _setOriginWeb3Instance() {
    const oThis = this,
      wsProvider = oThis.ic().configStrategy.originGeth.readOnly.wsProvider;

    oThis.web3Instance = web3Provider.getInstance(wsProvider).web3WsProvider;
  }

  /**
   * Set aux web3 instance
   *
   * @sets oThis.web3Instance
   *
   * @private
   */
  _setAuxWeb3Instance() {
    const oThis = this,
      wsProvider = oThis.ic().configStrategy.auxGeth.readOnly.wsProvider;

    oThis.web3Instance = web3Provider.getInstance(wsProvider).web3WsProvider;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    let blockGenerationTime = null;

    if (oThis.isOriginChainId) {
      oThis._setOriginWeb3Instance();
      blockGenerationTime = oThis.ic().configStrategy.originGeth.blockGenerationTime;
    } else {
      oThis._setAuxWeb3Instance();
      blockGenerationTime = oThis.ic().configStrategy.auxGeth.blockGenerationTime;
    }

    const blockDetail = await oThis.web3Instance.eth.getBlock('latest'),
      dataToCache = {
        block: blockDetail.number,
        createdTimestamp: blockDetail.timestamp,
        blockGenerationTime: blockGenerationTime
      };

    return responseHelper.successWithData(dataToCache);
  }
}

InstanceComposer.registerAsShadowableClass(BlockTimeDetails, coreConstants.icNameSpace, 'BlockTimeDetailsCache');

module.exports = {};
