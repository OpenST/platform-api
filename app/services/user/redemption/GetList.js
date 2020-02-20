const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/RedemptionIdsByUserId');
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserRedemptionsByUuid');

/**
 * Class to fetch user redemptions list.
 *
 * @class UserRedemptionList
 */
class UserRedemptionList extends ServiceBase {
  /**
   * Constructor to fetch user redemptions list.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {number} params.user_id
   * @param {number} params.pagination_identifier
   * @param {string} params.limit
   * @param {string} params.status
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;

    oThis.userId = params.user_id;
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];
    oThis.limit = params.limit;
    oThis.status = params.status;

    oThis.page = null;
    oThis.redemptionUuids = [];
    oThis.userRedemptions = [];
    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Async perform.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis._validateTokenStatus();

    await oThis._setRedemptionUuids();

    await oThis._fetchRedemptions();

    await oThis._returnResponse();
  }

  /**
   * Sets pagination params
   * @returns {Promise}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    // Parameters in paginationIdentifier take higher precedence.
    if (oThis.paginationIdentifier) {
      const parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.page = parsedPaginationParams.page; // Override page.
      oThis.limit = parsedPaginationParams.limit; // Override limit.
    } else {
      oThis.page = 1;
      oThis.limit = oThis.limit || pagination.defaultRedemptionListPageSize;
    }

    await oThis._validatePageSize();
  }

  /**
   * Fetch user redemption uuids
   * @returns {Promise}
   * @private
   */
  async _setRedemptionUuids() {
    const oThis = this;

    let response = null;

    if (oThis.status) {
      response = await new UserRedemptionModel().fetchUuidsByUserId({
        userId: oThis.userId,
        page: oThis.page,
        limit: oThis.limit,
        status: oThis.status
      });
    } else {
      const RedemptionsByUserIdCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'RedemptionIdsByUserId');

      response = await new RedemptionsByUserIdCache({
        userId: oThis.userId,
        page: oThis.page,
        limit: oThis.limit
      }).fetch();
    }

    if (response.data.uuids.length === oThis.limit) {
      oThis.responseMetaData[pagination.nextPagePayloadKey] = {
        page: oThis.page + 1,
        limit: oThis.limit
      };
    }

    oThis.redemptionUuids = response.data.uuids;
  }

  /**
   * Fetch redemptions
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchRedemptions() {
    const oThis = this;

    const RedemptionsByIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid');

    const response = await new RedemptionsByIdCache({
      uuids: oThis.redemptionUuids
    }).fetch();

    const redemptionsMap = response.data;
    for (let index = 0; index < oThis.redemptionUuids.length; index++) {
      const redemptionDetail = redemptionsMap[oThis.redemptionUuids[index]];

      if (redemptionDetail) {
        oThis.userRedemptions.push(redemptionDetail);
      }
    }
  }

  /**
   * Return validation error.
   *
   * @param {string} code
   * @param {array} paramErrors
   * @param {object} debugOptions
   *
   * @return {Promise}
   * @private
   */
  _validationError(code, paramErrors, debugOptions) {
    return Promise.reject(
      responseHelper.paramValidationError({
        internal_error_identifier: code,
        api_error_identifier: 'invalid_params',
        params_error_identifiers: paramErrors,
        debug_options: debugOptions
      })
    );
  }

  /**
   * Return recovery owner entity.
   *
   * @returns {Promise<>}
   * @private
   */
  async _returnResponse() {
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
    return pagination.defaultRedemptionListPageSize;
  }

  /**
   * Returns minimum page limit.
   *
   * @returns {number}
   * @private
   */
  _minPageLimit() {
    return pagination.minRedemptionListPageSize;
  }

  /**
   * Returns maximum page limit.
   *
   * @returns {number}
   * @private
   */
  _maxPageLimit() {
    return pagination.maxRedemptionListPageSize;
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
