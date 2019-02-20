'use strict';

/**
 * Cache for fetching previous owner map by userId and tokenId. Extends base cache.
 *
 * @module lib/cacheManagement/chain/PreviousOwnersMap
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/device/PreviousWalletAddress');

const InstanceComposer = OSTBase.InstanceComposer;

class PreviousOwnersMap extends BaseCacheManagement {
  /**
   * Constructor for Device by user id cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.userId {String} - user id
   * @param params.shardNumber {Number} - shard number
   * @param params.tokenId {Number} - token id
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;
    oThis.shardNumber = params.shardNumber; //optional;

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

    oThis.cacheKey =
      oThis._cacheKeyPrefix() + 'l_cm_c_pom_' + oThis.userId.toString() + '_tk_' + oThis.tokenId.toString();

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 1 day;

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    //Fetch user data. Using multisig address. fetch owner addresses.

    if (!oThis.shardNumber) {
      let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
        tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
        cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

      if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'l_cm_c_pom_1',
            api_error_identifier: 'resource_not_found',
            params_error_identifiers: ['user_not_found'],
            debug_options: {}
          })
        );
      }

      const userData = cacheFetchRsp.data[oThis.userId];
      if (userData['kind'] !== tokenUserConstants.userKind) {
        logger.error('Wrong user kind');
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_cm_c_pom_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: {}
          })
        );
      }
      oThis.multisigProxyAddress = userData['multisigAddress'];
    }

    let previousOwnerAddressMap = {};
    if (oThis.multisigProxyAddress) {
      let PreviousOwner = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousWalletAddress'),
        previousOwnersObj = new PreviousOwner({ multiSigProxyAddress: oThis.multisigProxyAddress }),
        previousOwnersRsp = await previousOwnersObj.perform();

      if (previousOwnersRsp.isFailure()) {
        return Promise.reject(previousOwnersRsp);
      }

      let previousOwnersArray = previousOwnersRsp.data;
      previousOwnerAddressMap = oThis._prepareOwnerAddressesMap(previousOwnersArray);
    }

    return responseHelper.successWithData(previousOwnerAddressMap);
  }

  _prepareOwnerAddressesMap(previousOwnersArray) {
    const oThis = this;
    let sentinalAddress = '0x0000000000000000000000000000000000000001',
      arrayLength = previousOwnersArray.length;

    let previousOwnerAddressMap = {};
    previousOwnerAddressMap[previousOwnersArray[0]] = sentinalAddress;
    for (let i = 1; i < arrayLength; i++) {
      previousOwnerAddressMap[previousOwnersArray[i]] = previousOwnersArray[i - 1];
    }

    return previousOwnerAddressMap;
  }
}

InstanceComposer.registerAsShadowableClass(PreviousOwnersMap, coreConstants.icNameSpace, 'PreviousOwnersMap');

module.exports = {};
