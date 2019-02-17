'use strict';

/**
 *  Fetch session details by userId and addresses.
 *
 * @module app/services/session/get/Base
 */

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ServiceBase = require(rootPrefix + '/app/services/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');
require(rootPrefix + '/lib/cacheManagement/shared/BlockTimeDetails');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

const BigNumber = require('bignumber.js');

class SessionGetBase extends ServiceBase {
  /**
   * @param params
   * @param {String}   params.user_id
   * @param {Integer} params.client_id
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;
    oThis.clientId = params.client_id;

    oThis.sessionShardNumber = null;
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateParams();

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    await oThis._fetchUserSessionShardNumber();

    await oThis._setAddresses();

    let response = await oThis._fetchSessionFromCache();

    return responseHelper.successWithData(response);
  }

  /**
   * @private
   */
  _validateParams() {
    throw 'sub class to implement';
  }

  /**
   * @private
   */
  _setAddresses() {
    throw 'sub class to implement';
  }

  /**
   * @private
   */
  _fetchSessionFromCache() {
    throw 'sub class to implement';
  }

  async _fetchUserSessionShardNumber() {
    const oThis = this;

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch(),
      userData = cacheFetchRsp.data[oThis.userId];

    if (!CommonValidators.validateObject(userData)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_s_l_bui_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    oThis.sessionShardNumber = userData['sessionShardNumber'];
  }

  /**
   * Get session details of a user from a multi cache
   *
   * @returns {Promise<*|result>}
   */
  async _getUserSessionsDataFromCache(addresses) {
    const oThis = this;

    let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        addresses: addresses,
        shardNumber: oThis.sessionShardNumber
      }),
      response = await sessionsByAddressCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_s_l_bui_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    response = await oThis._addExpirationTime(response);

    return response;
  }

  /**
   * Add expiration timestamp to session details
   *
   * @private
   */
  async _addExpirationTime(response) {
    const oThis = this,
      finalResponse = {},
      chainId = oThis.ic().configStrategy.auxGeth.chainId,
      BlockTimeDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockTimeDetailsCache'),
      blockTimeDetailsCache = new BlockTimeDetailsCache({ chainId: chainId });

    let blockDetails = await blockTimeDetailsCache.fetch(),
      blockGenerationTimeInSecs = Number(blockDetails.data.blockGenerationTime),
      lastKnownBlockCreatedTimeInSecs = Number(blockDetails.data.createdTimestamp),
      lastKnownBlockNumber = Number(blockDetails.data.block);

    for (let address in response.data) {
      let sessionData = response.data[address];

      if (!CommonValidators.validateObject(sessionData)) {
        continue;
      }

      let sessionExpirationHeight = Number(sessionData.expirationHeight);

      let blockDifference = sessionExpirationHeight - lastKnownBlockNumber,
        timeDifferenceInSecs = blockDifference * blockGenerationTimeInSecs,
        approxTimeInSecs = lastKnownBlockCreatedTimeInSecs + timeDifferenceInSecs;

      sessionData['expirationTimestamp'] = approxTimeInSecs;

      finalResponse[address] = sessionData;
    }

    return responseHelper.successWithData(finalResponse);
  }
}

module.exports = SessionGetBase;
