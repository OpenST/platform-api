'use strict';
/**
 * Cache for fetching previous authorized addresses map by userId and tokenId. Extends base cache.
 *
 * @module lib/cacheManagement/chain/PreviousOwnersMap
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

require(rootPrefix + '/lib/PreviousAuthorizedAddresses');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for fetching previous authorized addresses map by userId and tokenId.
 *
 * @class
 */
class PreviousOwnersMap extends BaseCacheManagement {
  /**
   * Constructor for fetching previous authorized addresses map by userId and tokenId.
   *
   * @param {Object} params: cache key generation & expiry related params
   * @param {String} params.userId: user id
   * @param {Number} params.tokenId: token id
   * @param {Number} [params.shardNumber]: shard number
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;
    oThis.shardNumber = params.shardNumber; // Optional;

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
  _setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'l_cm_c_pom_' + oThis.userId + '_tk_' + oThis.tokenId;

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it.
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 1 day;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source.
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    //Fetch user data. Using multisig address. fetch owner addresses.

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
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
      logger.error('Wrong user kind ', userData['kind']);
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_cm_c_pom_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_user_to_fetch_linked_address'],
          debug_options: { userKind: userData['kind'] }
        })
      );
    }
    oThis.multisigProxyAddress = userData['multisigAddress'];

    let previousAuthorizedOwnerAddressMap = {};
    if (oThis.multisigProxyAddress) {
      let PreviousAuthorizedAddresses = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'PreviousAuthorizedAddresses'),
        previousOwnersObj = new PreviousAuthorizedAddresses({ multiSigProxyAddress: oThis.multisigProxyAddress }),
        previousOwnersRsp = await previousOwnersObj.perform();

      if (previousOwnersRsp.isFailure()) {
        return Promise.reject(previousOwnersRsp);
      }

      previousAuthorizedOwnerAddressMap = oThis._prepareOwnerAddressesMap(previousOwnersRsp.data);
    }

    return responseHelper.successWithData(previousAuthorizedOwnerAddressMap);
  }

  /**
   * Prepare map to be stored in cache
   *
   * @param {Array} previousOwnersArray
   *
   * @private
   */
  _prepareOwnerAddressesMap(previousOwnersArray) {
    const sentinelAddress = '0x0000000000000000000000000000000000000001',
      arrayLength = previousOwnersArray.length;

    const previousOwnerAddressMap = {
      [previousOwnersArray[0]]: sentinelAddress
    };

    for (let i = 1; i < arrayLength; i++) {
      previousOwnerAddressMap[previousOwnersArray[i]] = previousOwnersArray[i - 1];
    }

    return previousOwnerAddressMap;
  }
}

InstanceComposer.registerAsShadowableClass(PreviousOwnersMap, coreConstants.icNameSpace, 'PreviousOwnersMap');

module.exports = {};
