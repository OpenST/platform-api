const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/UserSaltEncryptorKey');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
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
   * @param {number} [params.pagination_identifier]
   * @param {array} [params.user_redemption_uuids]
   * @param {string} [params.limit]
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
    oThis.paginationIdentifier = params[paginationConstants.paginationIdentifierKey];
    oThis.inputUserRedemptionUuids = params.user_redemption_uuids;
    oThis.limit = params.limit;

    oThis.page = null;
    oThis.redemptionUuids = [];
    oThis.userRedemptions = [];
    oThis.responseMetaData = {
      [paginationConstants.nextPagePayloadKey]: {}
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

    await oThis._setRedemptionUuids();

    await oThis._fetchRedemptions();

    return oThis._prepareResponse();
  }

  /**
   * Validate and sanitize params.
   *
   * @sets oThis.page, oThis.limit, oThis.redemptionUuids, oThis.userId
   *
   * @returns {Promise}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

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

    // Validate input user redemption uuids.
    for (let index = 0; index < oThis.inputUserRedemptionUuids.length; index++) {
      oThis.redemptionUuids.push(basicHelper.sanitizeuuid(oThis.inputUserRedemptionUuids[index]));
    }

    oThis.userId = basicHelper.sanitizeuuid(oThis.userId);

    await oThis._validateTokenStatus();

    await oThis._validateTokenUser();

    await oThis._validatePageSize();
  }

  /**
   * Validate whether user belongs to token or not.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateTokenUser() {
    const oThis = this;

    const TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId]
      });

    const cacheResponse = await tokenUserDetailsCacheObj.fetch();
    if (cacheResponse.isFailure()) {
      return Promise.reject(cacheResponse);
    }

    const userData = cacheResponse.data[oThis.userId];

    if (!CommonValidators.validateObject(userData)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_gl_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: { userId: oThis.userId, tokenId: oThis.tokenId }
        })
      );
    }
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

    if (!oThis.inputUserRedemptionUuids || oThis.inputUserRedemptionUuids.length === 0) {
      await oThis._fetchRedemptionUuidsFromCache();
    } else {
      oThis.redemptionUuids = oThis.inputUserRedemptionUuids;
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

    if (oThis.redemptionUuids.length === oThis.limit) {
      oThis.responseMetaData[paginationConstants.nextPagePayloadKey] = {
        page: oThis.page + 1,
        limit: oThis.limit
      };
    }
  }

  /**
   * Fetch redemptions.
   *
   * @sets oThis.userRedemptions
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchRedemptions() {
    const oThis = this;

    if (oThis.redemptionUuids.length === 0) {
      return;
    }

    const RedemptionsByIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid');

    const response = await new RedemptionsByIdCache({
      uuids: oThis.redemptionUuids
    }).fetch();

    const UserSaltEncryptorKeyCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserSaltEncryptorKeyCache'),
      encryptionSaltResp = await new UserSaltEncryptorKeyCache({ tokenId: oThis.tokenId }).fetchDecryptedData();

    const encryptionSalt = encryptionSaltResp.data.encryption_salt_d;

    const redemptionsMap = response.data;
    for (let index = 0; index < oThis.redemptionUuids.length; index++) {
      const redemptionDetail = redemptionsMap[oThis.redemptionUuids[index]];

      if (redemptionDetail) {
        if (redemptionDetail.emailAddress) {
          redemptionDetail.emailAddress = await new AddressesEncryptor({ encryptionSaltD: encryptionSalt }).decrypt(
            redemptionDetail.emailAddress
          );
        }
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
