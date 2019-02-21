'use strict';

/**
 * Cache for selecting one address from session address, based on
 *
 * @module lib/cacheManagement/chain/SelectSessionForCompanyToUserTx
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class SelectSessionForCompanyToUserTx extends BaseCacheManagement {
  /**
   * Constructor for balance shard number cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param {Number} params.tokenId - token id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.useObject = false;

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

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'c_c_ctutx_' + oThis.tokenId;

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 3 days;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @returns {Promise<Result>}: On success, data.value has value. On failure, error details returned.
   */
  async fetch() {
    const oThis = this;

    let data = null,
      fetchIncrementedValueRsp = await oThis._increment();

    // TODO - what if index overflow
    // TODO - var name

    // if found in cache, return with data
    if (fetchIncrementedValueRsp.isSuccess() && fetchIncrementedValueRsp.data.response) {
      data = fetchIncrementedValueRsp.data.response;
    } else {
      // if cache miss call sub class method to fetch data from source and set cache
      let fetchDataRsp = await oThis.fetchDataFromSource();

      // if fetch from source failed do not set cache and return error response
      if (fetchDataRsp.isFailure()) return fetchDataRsp;

      data = fetchDataRsp.data;
      // DO NOT WAIT for cache being set
      oThis._setCache(data);
    }

    return responseHelper.successWithData(data);
  }

  /**
   * increment
   *
   * @return {promise<result>}
   * @private
   * @ignore
   */
  async _increment() {
    const oThis = this;
    return oThis.cacheImplementer.increment(oThis.cacheKey);
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    return responseHelper.successWithData(1);
  }
}

InstanceComposer.registerAsShadowableClass(
  SelectSessionForCompanyToUserTx,
  coreConstants.icNameSpace,
  'SelectSessionForCompanyToUserTx'
);

module.exports = {};
