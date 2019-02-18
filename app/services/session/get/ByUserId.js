'use strict';

/**
 *  Fetch session details by userId.
 *
 * @module app/services/session/get/ByUserId
 */
const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  SessionGetBase = require(rootPrefix + '/app/services/session/get/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chain/SessionAddressesByUserId');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to list sessions by userId.
 *
 * @class SessionListByUserId
 */
class SessionListByUserId extends SessionGetBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id
   * @param {Array} [params.addresses]
   * @param {Integer} [params.token_id]
   * @param {String} [params.pagination_identifier] - pagination identifier to fetch page
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];
    oThis.addresses = params.addresses;

    oThis.limit = pagination.defaultSessionPageSize;

    oThis.paginationParams = null;
    oThis.nextPagePayload = null;
  }

  /**
   * Validate Specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateParams() {
    const oThis = this;

    if (oThis.addresses && oThis.addresses.length > pagination.maxSessionPageSize) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_s_l_bui_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['addresses_more_than_allowed_limit'],
          debug_options: {}
        })
      );
    }

    if (oThis.paginationIdentifier) {
      oThis.paginationParams = basicHelper.decryptNextPagePayload(oThis.paginationIdentifier);
    }
  }

  /**
   * Set addresses for fetching session details
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    // If addresses are sent as filter and return from here
    if (oThis.addresses) {
      return Promise.resolve(responseHelper.successWithData());
    }

    // Else fetch addresses from relevant source
    let response;

    // Cache only first page
    if (oThis.paginationParams && oThis.paginationParams.lastEvaluatedKey) {
      response = await oThis._fetchFromDdb();
    } else {
      response = await oThis._fetchFromCache();
    }

    oThis.addresses = response.data['addresses'];
    oThis.nextPagePayload = response.data['nextPagePayload'];
  }

  /**
   * Fetch sessions from cache.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchSessionFromCache() {
    const oThis = this;

    let response = await oThis._getUserSessionsDataFromCache(oThis.addresses);

    let returnData = {
      [resultType.sessions]: response.data
    };

    if (oThis.nextPagePayload) {
      returnData[resultType.nextPagePayload] = oThis.nextPagePayload;
    }

    return returnData;
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

    let lastEvaluatedKey = oThis.paginationParams ? oThis.paginationParams.lastEvaluatedKey : '';

    return sessionObj.getSessionsAddresses(oThis.userId, oThis.limit, lastEvaluatedKey);
  }

  /**
   * fetch user sessions from cache
   *
   * @private
   */
  async _fetchFromCache() {
    const oThis = this;

    let SessionAddressesByUserId = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'SessionAddressesByUserIdCache'),
      sessionAddressesByUserId = new SessionAddressesByUserId({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        shardNumber: oThis.sessionShardNumber
      });

    return sessionAddressesByUserId.fetch();
  }
}

InstanceComposer.registerAsShadowableClass(SessionListByUserId, coreConstants.icNameSpace, 'SessionListByUserId');

module.exports = {};
