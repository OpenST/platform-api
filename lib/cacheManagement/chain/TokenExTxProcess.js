'use strict';

/**
 * Cache to fetch running process details for a token. Extends base cache.
 *
 * @module lib/cacheManagement/chain/TokenExTxProcess
 */

const rootPrefix = '../../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  GetTokenWorkingProcess = require(rootPrefix + 'lib/executeTransactionManagement/GetTokenWorkingProcess');

const InstanceComposer = OSTBase.InstanceComposer;

class TokenExTxProcess extends BaseCacheManagement {
  /**
   * Constructor for token shard numbers cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.tokenId {Number} - token id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;

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

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'c_t_extx_rp_' + oThis.tokenId.toString();

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 30 * 24 * 60 * 60; // 30 days;

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    let response = await new GetTokenWorkingProcess({ tokenId: oThis.tokenId }).perform();

    return responseHelper.successWithData(response.data);
  }
}

InstanceComposer.registerAsShadowableClass(TokenExTxProcess, coreConstants.icNameSpace, 'TokenExTxProcessCache');

module.exports = {};
