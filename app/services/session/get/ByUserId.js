'use strict';
/**
 *  Fetch session details by userId.
 *
 * @module app/services/session/get/ByUserId
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  SessionGetBase = require(rootPrefix + '/app/services/session/get/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');

/**
 * Class to list sessions by userId.
 *
 * @class SessionListByUserId
 */
class SessionListByUserId extends SessionGetBase {
  /**
   * @param params
   * @param {Array} [params.addresses]
   * @param {Integer} [params.limit]
   * @param {String} [params.pagination_identifier] - pagination identifier to fetch page
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.addresses = params.addresses || [];
    oThis.limit = params.limit || oThis._defaultPageLimit();
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];

    oThis.sessionAddresses = [];
    oThis.lastEvaluatedKey = null;
    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    await super._validateAndSanitizeParams();

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      let parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.addresses = [];
      oThis.limit = parsedPaginationParams.limit; //override limit
      oThis.lastEvaluatedKey = parsedPaginationParams.lastEvaluatedKey;
    }

    if (oThis.addresses && oThis.addresses.length > oThis._maxPageLimit()) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_s_l_bui_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['addresses_more_than_allowed_limit'],
          debug_options: {}
        })
      );
    }

    //Validate limit
    return await oThis._validatePageSize();
  }

  /**
   * Set addresses for fetching session details
   *
   * Sets oThis.sessionAddresses
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    if (!oThis.addresses || oThis.addresses.length === 0) {

      // Else fetch addresses from relevant source
      let response;

      // Cache only first page
      if (oThis.lastEvaluatedKey) {
        response = await oThis._fetchFromDdb();
      } else {
        response = await oThis._fetchFromCache();
      }

      oThis.sessionAddresses = response.data.addresses;
      oThis.responseMetaData[pagination.nextPagePayloadKey] = response.data[pagination.nextPagePayloadKey] || {};

    } else {
      for (let index = 0; index < oThis.addresses.length; index++) {
        oThis.sessionAddresses.push(oThis.addresses[index].toLowerCase());
      }
    }
  }

  /**
   * Fetch user sessions from DDB
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchFromDdb() {
    const oThis = this,
      SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel');

    let sessionObj = new SessionModel({ shardNumber: oThis.sessionShardNumber });


    return sessionObj.getSessionsAddresses(oThis.userId, oThis._currentPageLimit(), oThis.lastEvaluatedKey);
  }

  /**
   * fetch user sessions from cache
   *
   * @private
   */
  async _fetchFromCache() {
    const oThis = this;

    let UserSessionAddressCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCache = new UserSessionAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        shardNumber: oThis.sessionShardNumber,
        limit: oThis._currentPageLimit()
      });

    return userSessionAddressCache.fetch();
  }

  /**
   * Fetch sessions from cache.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchSessionFromCache() {
    const oThis = this;

    let response = await oThis._getUserSessionsDataFromCache(oThis.sessionAddresses);

    let returnData = {
      [resultType.sessions]: response.data,
      [resultType.meta]: oThis.responseMetaData
    };

    return returnData;
  }

  /**
   * Fetch session nonce
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchSessionNonce(responseData) {
    const oThis = this,
      currentTimestamp = Math.floor(new Date() / 1000);

    let promises = [];
    for (let index in responseData.sessions) {
      let sessionData = responseData.sessions[index],
        approxExpirationTimestamp = sessionData.expirationTimestamp || 0;

      // Compare approx expirtaion time with current time and avoid fetching nonce from contract.
      // If session is expired then avoid fetching from contract.
      if (Number(approxExpirationTimestamp) > currentTimestamp) {
        promises.push(oThis._fetchSessionTokenHolderNonce(sessionData.address));
      }
    }
    await Promise.all(promises);
    for (let index in responseData.sessions) {
      let sessionData = responseData.sessions[index];
      responseData.sessions[index].nonce = oThis.sessionNonce[sessionData.address];
    }

    return responseData;
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultSessionPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minSessionPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxSessionPageSize;
  }

  /**
   * _currentPageLimit
   *
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }
}

InstanceComposer.registerAsShadowableClass(SessionListByUserId, coreConstants.icNameSpace, 'SessionListByUserId');

module.exports = {};
