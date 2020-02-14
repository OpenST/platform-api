/**
 * Module to get list of user redemptions
 *
 * @module app/services/user/redemption/List
 */

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
require(rootPrefix + '/lib/cacheManagement/chainMulti/RedemptionsById');

/**
 * Class to fetch user redemption list
 *
 * @class UserRedemptionList
 */
class UserRedemptionList extends ServiceBase {
  /**
   * Constructor to fetch user redemption list
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {number} params.user_id
   * @param {number} params.pagination_identifier
   * @param {string} params.limit
   * @param {string} params.status
   *
   * @constructor
   */
  constructor(params) {
    super(params);
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

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      const parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.page = parsedPaginationParams.page; // Override page
      oThis.limit = parsedPaginationParams.limit; // Override limit
    } else {
      oThis.page = 1;
      oThis.limit = oThis.limit || pagination.defaultRedemptionListPageSize;
    }

    await oThis._validatePageSize();
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultRedemptionListPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minRedemptionListPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxRedemptionListPageSize;
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

  /**
   * Fetch user redemption uuids
   * @returns {Promise}
   * @private
   */
  async _setRedemptionUuids() {
    const oThis = this;

    let response = null;

    if (!oThis.status) {
      const RedemptionsByUserIdCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'RedemptionIdsByUserId');

      response = await new RedemptionsByUserIdCache({
        userId: oThis.userId,
        page: oThis.page,
        limit: oThis.limit
      }).fetch();
    } else {
      response = await new UserRedemptionModel().fetchUuidsByUserId({
        userId: oThis.userId,
        page: oThis.page,
        limit: oThis.limit,
        status: oThis.status
      });
    }

    if (response.data.uuids.length == oThis.limit) {
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

    const RedemptionsByIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RedemptionsById');

    const response = await new RedemptionsByIdCache({
      uuids: oThis.redemptionUuids
    }).fetch();

    oThis.userRedemptions = response.data.redemptions;
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

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.userRedemptions]: oThis.userRedemptions,
        [resultType.meta]: oThis.responseMetaData
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(UserRedemptionList, coreConstants.icNameSpace, 'UserRedemptionList');

module.exports = {};
