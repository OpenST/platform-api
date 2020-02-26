const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  UserRedemptionBase = require(rootPrefix + '/app/services/user/redemption/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/RedemptionIdsByUserId');

/**
 * Class to fetch user redemptions list.
 *
 * @class UserRedemptionList
 */
class UserRedemptionList extends UserRedemptionBase {
  /**
   * Constructor to fetch user redemptions list.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {number} params.user_id
   * @param {array<string>} [params.redemption_ids]
   * @param {number} [params.pagination_identifier]
   * @param {string} [params.limit]
   *
   * @augments UserRedemptionBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.inputUserRedemptionUuids = params.redemption_ids;
    oThis.paginationIdentifier = params[paginationConstants.paginationIdentifierKey];
    oThis.limit = params.limit;

    oThis.page = null;
    oThis.responseMetaData = {
      [paginationConstants.nextPagePayloadKey]: {}
    };
  }

  /**
   * Validate and sanitize params.
   *
   * @sets oThis.page, oThis.limit, oThis.redemptionUuids
   *
   * @returns {Promise}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    await super._validateAndSanitizeParams();

    // Parameters in paginationIdentifier take higher precedence.
    if (oThis.paginationIdentifier) {
      const parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.inputUserRedemptionUuids = []; // Redemption Ids not allowed after first page.
      oThis.page = parsedPaginationParams.page; // Override page.
      oThis.limit = parsedPaginationParams.limit; // Override limit.
    } else {
      oThis.inputUserRedemptionUuids = oThis.inputUserRedemptionUuids || [];
      oThis.page = 1;
      oThis.limit = oThis.limit || oThis._defaultPageLimit();
    }

    // Validate input redemption user uuids length.
    if (oThis.inputUserRedemptionUuids && oThis.inputUserRedemptionUuids.length > oThis._maxPageLimit()) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_gl_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['redemption_ids_more_than_allowed_limit'],
          debug_options: {}
        })
      );
    }

    // Validate input user redemption uuids.
    for (let index = 0; index < oThis.inputUserRedemptionUuids.length; index++) {
      oThis.redemptionUuids.push(basicHelper.sanitizeuuid(oThis.inputUserRedemptionUuids[index]));
    }

    if (oThis.redemptionUuids.length > 0) {
      oThis.redemptionUuids = [...new Set(oThis.redemptionUuids)];
    }

    await oThis._validatePageSize();
  }

  /**
   * Set redemption uuids.
   *
   * @sets oThis.redemptionUuids
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setRedemptionUuids() {
    const oThis = this;

    if (oThis.redemptionUuids.length === 0) {
      await oThis._fetchRedemptionUuidsFromCache();
    }
  }

  /**
   * Fetch redemption uuids from cache for a user.
   *
   * @sets oThis.redemptionUuids
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchRedemptionUuidsFromCache() {
    const oThis = this;

    const RedemptionsByUserIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RedemptionIdsByUserId');

    const cacheResponse = await new RedemptionsByUserIdCache({
      userId: oThis.userId,
      page: oThis.page,
      limit: oThis.limit
    }).fetch();
    if (cacheResponse.isFailure()) {
      return Promise.reject(cacheResponse);
    }

    oThis.redemptionUuids = cacheResponse.data.uuids;

    if (oThis.redemptionUuids.length >= oThis.limit) {
      oThis.responseMetaData[paginationConstants.nextPagePayloadKey] = {
        [paginationConstants.paginationIdentifierKey]: {
          page: oThis.page + 1,
          limit: oThis.limit
        }
      };
    }
  }

  /**
   * Return service response.
   *
   * @returns {Promise<>}
   * @private
   */
  async _prepareResponse() {
    const oThis = this;

    return responseHelper.successWithData({
      [resultType.userRedemptions]: oThis.userRedemptions,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * Returns default page limit.
   *
   * @returns {number}
   * @private
   */
  _defaultPageLimit() {
    return paginationConstants.defaultRedemptionListPageSize;
  }

  /**
   * Returns minimum page limit.
   *
   * @returns {number}
   * @private
   */
  _minPageLimit() {
    return paginationConstants.minRedemptionListPageSize;
  }

  /**
   * Returns maximum page limit.
   *
   * @returns {number}
   * @private
   */
  _maxPageLimit() {
    return paginationConstants.maxRedemptionListPageSize;
  }

  /**
   * Returns current page limit.
   *
   * @returns {number}
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }
}

InstanceComposer.registerAsShadowableClass(UserRedemptionList, coreConstants.icNameSpace, 'UserRedemptionList');

module.exports = {};
