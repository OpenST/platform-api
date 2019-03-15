'use strict';
/**
 *  Fetch session details by userId and addresses.
 *
 * @module app/services/session/get/Base
 */

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  ServiceBase = require(rootPrefix + '/app/services/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');
require(rootPrefix + '/lib/cacheManagement/shared/BlockTimeDetails');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/nonce/contract/TokenHolder');

/**
 * Class for get sessions base.
 *
 * @class
 */
class GetSessionBase extends ServiceBase {
  /**
   *
   * @param {Object} params
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
    oThis.sessionNonce = {};
    oThis.sessionAddresses = [];
    oThis.lastKnownChainBlockDetails = {};
    oThis.sessionDetails = [];
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis._validateTokenStatus();

    await oThis._fetchUserSessionShardNumber();

    await oThis._setSessionAddresses();

    await oThis._setLastKnownChainBlockDetails();

    await oThis._fetchSessionsExtendedDetails();

    return oThis._formatApiResponse();
  }

  /**
   * Fetch session shard number of user
   *
   * Sets oThis.sessionShardNumber
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _fetchUserSessionShardNumber() {
    const oThis = this;

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch(),
      userData = cacheFetchRsp.data[oThis.userId];

    if (!CommonValidators.validateObject(userData)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_g_b_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    if (userData.tokenHolderStatus !== tokenUserConstants.tokenHolderActiveStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_g_b_2',
          api_error_identifier: 'token_holder_not_active',
          debug_options: {}
        })
      );
    }

    oThis.sessionShardNumber = userData.sessionShardNumber;
  }

  /**
   * Set last known block details of a specifc chain
   *
   * Sets oThis.lastKnownChainBlockDetails
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setLastKnownChainBlockDetails() {
    const oThis = this,
      chainId = oThis.ic().configStrategy.auxGeth.chainId,
      BlockTimeDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockTimeDetailsCache'),
      blockTimeDetailsCache = new BlockTimeDetailsCache({ chainId: chainId });

    let blockDetails = await blockTimeDetailsCache.fetch();

    oThis.lastKnownChainBlockDetails = {
      blockGenerationTime: Number(blockDetails.data.blockGenerationTime),
      lastKnownBlockTime: Number(blockDetails.data.createdTimestamp),
      lastKnownBlockNumber: Number(blockDetails.data.block)
    };
  }

  /**
   * Fetch session extended details
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchSessionsExtendedDetails() {
    const oThis = this;

    let sessionsMap = (await oThis._fetchSessionsFromCache()).data;

    let noncePromiseArray = [],
      currentTimestamp = Math.floor(new Date() / 1000);

    for (let index in oThis.sessionAddresses) {
      let sessionAddress = oThis.sessionAddresses[index],
        session = sessionsMap[sessionAddress];

      if (!CommonValidators.validateObject(session)) {
        continue;
      }

      // Add expirationTimestamp to session
      // Only send approx expiry when authorized
      session.expirationTimestamp = null;
      if (session.status === sessionConstants.authorizedStatus) {
        session.expirationHeight = Number(session.expirationHeight);

        let blockDifference = session.expirationHeight - oThis.lastKnownChainBlockDetails.lastKnownBlockNumber,
          timeDifferenceInSecs = blockDifference * oThis.lastKnownChainBlockDetails.blockGenerationTime,
          approxTimeInSecs = oThis.lastKnownChainBlockDetails.lastKnownBlockTime + timeDifferenceInSecs;

        session.expirationTimestamp = approxTimeInSecs;
      }

      // Compare approx expirtaion time with current time and avoid fetching nonce from contract.
      // If session is expired then avoid fetching from contract.
      let approxExpirationTimestamp = session.expirationTimestamp || 0;
      if (Number(approxExpirationTimestamp) > currentTimestamp) {
        noncePromiseArray.push(oThis._fetchSessionTokenHolderNonce(session.address));
      }

      oThis.sessionDetails.push(session);
    }

    await Promise.all(noncePromiseArray);

    for (let i = 0; i < oThis.sessionDetails.length; i++) {
      let session = oThis.sessionDetails[i];
      session.nonce = oThis.sessionNonce[session.address] || null;
    }
  }

  /**
   * Get session details of a user from a multi cache
   *
   * @returns {Promise<*|result>}
   */
  async _fetchSessionsFromCache() {
    const oThis = this;

    let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        addresses: oThis.sessionAddresses,
        shardNumber: oThis.sessionShardNumber
      }),
      response = await sessionsByAddressCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_g_b_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return response;
  }

  /**
   * Fetch nonce from contract
   *
   * Sets oThis.sessionNonce
   *
   * @private
   */
  _fetchSessionTokenHolderNonce(sessionAddress) {
    const oThis = this;

    let TokenHolderNonceKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenHolderNonce'),
      auxChainId = oThis.ic().configStrategy.auxGeth.chainId,
      params = {
        auxChainId: auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        sessionAddress: sessionAddress
      };

    return new Promise(function(onResolve, onReject) {
      logger.debug('Fetching nonce session token holder nonce. SessionAddress:', sessionAddress);
      new TokenHolderNonceKlass(params)
        .perform()
        .then(function(resp) {
          logger.debug('Fetching nonce Done. SessionAddress:', sessionAddress, 'Data: ', resp);
          if (resp.isSuccess()) {
            oThis.sessionNonce[sessionAddress] = resp.data.nonce;
          }
          onResolve();
        })
        .catch(function(err) {
          logger.error(err);
          onResolve();
        });
    });
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  async _validateAndSanitizeParams() {
    throw 'sub-class to implement';
  }

  /**
   * @private
   */
  async _setSessionAddresses() {
    throw 'sub-class to implement';
  }

  /**
   * @private
   */
  async _formatApiResponse() {
    throw 'sub-class to implement';
  }
}

module.exports = GetSessionBase;
