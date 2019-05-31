/**
 * Module to create session entity.
 *
 * @module lib/webhooks/delegator/session
 */

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  SessionFormatter = require(rootPrefix + '/lib/formatter/entity/Session'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/nonce/contract/TokenHolder');
require(rootPrefix + '/lib/cacheManagement/shared/BlockTimeDetails');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

/**
 * Class to create session entity.
 *
 * @class Session
 */
class Session {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.sessionAddress
   * @param {object} ic
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload, ic) {
    const oThis = this;

    return oThis._asyncPerform(payload, ic).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/session.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_s_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.sessionAddress
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    const promisesArray = [];

    promisesArray.push(oThis._fetchUserSessionShardNumber(payload, ic));
    promisesArray.push(oThis._fetchLastKnownChainBlockDetails(ic));

    const promisesResponse = await Promise.all(promisesArray);

    const sessionShardNumber = promisesResponse[0];

    const lastKnownChainBlockDetails = promisesResponse[1];

    const sessionData = await oThis._fetchSessionDetails(payload, ic, sessionShardNumber, lastKnownChainBlockDetails);

    return oThis.formatSessionData(sessionData);
  }

  /**
   * Fetch session shard number of user.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.sessionAddress
   * @param {object} ic
   *
   * @returns {Promise<*|Promise<Promise<never>|*>>}
   * @private
   */
  async _fetchUserSessionShardNumber(payload, ic) {
    const TokenUserDetailsCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: payload.tokenId, userIds: [payload.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch(),
      userData = cacheFetchRsp.data[payload.userId];

    if (!CommonValidators.validateObject(userData)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_w_d_s_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    return userData.sessionShardNumber;
  }

  /**
   * Set last known block details of a specific chain.
   *
   * @param {object} ic
   *
   * @returns {Promise<{lastKnownBlockTime: number, blockGenerationTime: number, lastKnownBlockNumber: number}>}
   * @private
   */
  async _fetchLastKnownChainBlockDetails(ic) {
    const chainId = ic.configStrategy.auxGeth.chainId,
      BlockTimeDetailsCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BlockTimeDetailsCache'),
      blockTimeDetailsCache = new BlockTimeDetailsCache({ chainId: chainId });

    const blockDetails = (await blockTimeDetailsCache.fetch()).data;

    return {
      blockGenerationTime: Number(blockDetails.blockGenerationTime),
      lastKnownBlockTime: Number(blockDetails.createdTimestamp),
      lastKnownBlockNumber: Number(blockDetails.block)
    };
  }

  /**
   * Fetch session details.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.sessionAddress
   * @param {object} ic
   * @param {number} sessionShardNumber
   * @param {object} lastKnownChainBlockDetails
   * @param {number} lastKnownChainBlockDetails.lastKnownBlockTime
   * @param {number} lastKnownChainBlockDetails.blockGenerationTime
   * @param {number} lastKnownChainBlockDetails.lastKnownBlockNumber
   *
   * @returns {Promise<*|Promise<Promise<never>|*>>}
   * @private
   */
  async _fetchSessionDetails(payload, ic, sessionShardNumber, lastKnownChainBlockDetails) {
    const oThis = this;

    const sessionsMap = await oThis._fetchSessionsFromCache(payload, ic, sessionShardNumber);

    const sessionData = sessionsMap[payload.sessionAddress];
    const currentTimestamp = Math.floor(new Date() / 1000);

    if (!CommonValidators.validateObject(sessionData)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    // Add expirationTimestamp to session.
    // Only send approx expiry when authorized.
    sessionData.expirationTimestamp = null;

    if (sessionData.status === sessionConstants.authorizedStatus) {
      sessionData.expirationHeight = Number(sessionData.expirationHeight);

      const blockDifference = sessionData.expirationHeight - lastKnownChainBlockDetails.lastKnownBlockNumber,
        timeDifferenceInSecs = blockDifference * lastKnownChainBlockDetails.blockGenerationTime;

      sessionData.expirationTimestamp = lastKnownChainBlockDetails.lastKnownBlockTime + timeDifferenceInSecs;
    }

    // Compare approx expiration time with current time and avoid fetching nonce from contract.
    // If session is expired then avoid fetching from contract.
    const approxExpirationTimestamp = sessionData.expirationTimestamp || 0;

    if (Number(approxExpirationTimestamp) > currentTimestamp) {
      sessionData.nonce = await oThis._fetchSessionTokenHolderNonce(payload, ic);
    }

    return sessionData;
  }

  /**
   * Get session details of a user from a multi cache.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.sessionAddress
   * @param {object} ic
   * @param {number} sessionShardNumber
   *
   * @returns {Promise<*|Promise<Promise<never>|*>>}
   * @private
   */
  async _fetchSessionsFromCache(payload, ic, sessionShardNumber) {
    const SessionsByAddressCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: payload.userId,
        tokenId: payload.tokenId,
        addresses: [payload.sessionAddress],
        shardNumber: sessionShardNumber
      }),
      response = await sessionsByAddressCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_s_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return response.data;
  }

  /**
   * Fetch nonce from contract.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.sessionAddress
   * @param {object} ic
   *
   * @returns {Promise<null|number>}
   * @private
   */
  async _fetchSessionTokenHolderNonce(payload, ic) {
    const TokenHolderNonceKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenHolderNonce'),
      auxChainId = ic.configStrategy.auxGeth.chainId,
      params = {
        auxChainId: auxChainId,
        tokenId: payload.tokenId,
        userId: payload.userId,
        sessionAddress: payload.sessionAddress
      };

    const sessionNonceResponse = await new TokenHolderNonceKlass(params).perform();

    if (sessionNonceResponse.isSuccess()) {
      return sessionNonceResponse.data.nonce;
    }

    return null;
  }

  /**
   * Format session data using session entity formatter.
   *
   * @param {object} sessionData
   *
   * @returns {*|result}
   */
  formatSessionData(sessionData) {
    const sessionFormattedRsp = new SessionFormatter(sessionData).perform();

    return responseHelper.successWithData({
      result_type: resultType.session,
      [resultType.session]: sessionFormattedRsp.data
    });
  }
}

module.exports = new Session();
