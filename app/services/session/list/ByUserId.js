'use strict';

/**
 *  Fetch session details by userId.
 *
 * @module app/services/session/list/ByUserId
 */
const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  SessionListBase = require(rootPrefix + '/app/services/session/list/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chain/SessionAddressesByUserId');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to list sessions by userId.
 *
 * @class SessionListByUserId
 */
class SessionListByUserId extends SessionListBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {Integer} [params.token_id]
   * @param {Integer} [params.limit] - number of results to be returned on this page
   * @param {String} params.pagination_identifier - pagination identifier to fetch page
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.limit = params.limit;
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];
    oThis.paginationParams = null;
    oThis.defaultSessionPageSize = pagination.defaultSessionPageSize;
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   * @private
   */
  _sanitizeParams() {
    const oThis = this;

    super._sanitizeParams();

    if (oThis.paginationIdentifier) {
      oThis.paginationParams = basicHelper.decryptNextPagePayload(oThis.paginationIdentifier);
      if (!CommonValidators.validateDdbNextPagePayload(oThis.paginationParams)) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 's_s_l_bui_1',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_pagination_identifier'],
            debug_options: {}
          })
        );
      }
    }

    let limitVas = CommonValidators.validateAndSanitizeLimit(
      oThis.limit,
      oThis.defaultSessionPageSize,
      pagination.maxSessionPageSize
    );

    if (!limitVas[0]) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_s_l_bui_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_pagination_limit'],
          debug_options: {}
        })
      );
    }

    oThis.limit = limitVas[1];
  }

  /**
   * Set addresses for fetching session details
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let response;

    if (oThis.paginationParams || oThis.limit !== oThis.defaultSessionPageSize) {
      response = await oThis._fetchFromDdb();
    } else {
      response = await oThis._fetchFromCache();
    }

    oThis.addresses = response.data['addresses'];
    oThis.nextPagePayload = response.data['nextPagePayload'];
  }

  async _fetchFromDdb() {
    const oThis = this,
      SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel');

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch(),
      userData = cacheFetchRsp.data[oThis.userId];

    let sessionObj = new SessionModel({ shardNumber: userData['sessionShardNumber'] });

    let lastEvaluatedKey = oThis.paginationParams ? oThis.paginationParams.lastEvaluatedKey : '';

    return sessionObj.getSessionsAddresses(oThis.userId, oThis.limit, lastEvaluatedKey);
  }

  /**
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
        tokenId: oThis.tokenId
      });

    return sessionAddressesByUserId.fetch();
  }
}

InstanceComposer.registerAsShadowableClass(SessionListByUserId, coreConstants.icNameSpace, 'SessionListByUserId');

module.exports = {};
