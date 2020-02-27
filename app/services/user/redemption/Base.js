const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/UserSaltEncryptorKey');
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserRedemptionsByUuid');

/**
 * Base class to fetch user redemption(s).
 *
 * @class GetUserRedemption
 */
class UserRedemptionBase extends ServiceBase {
  /**
   * Constructor for base class to fetch user redemption(s).
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {number} params.user_id
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

    oThis.redemptionUuids = [];
    oThis.userRedemptions = [];
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
   * @sets oThis.userId
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    oThis.userId = basicHelper.sanitizeuuid(oThis.userId);

    await oThis._validateTokenStatus();

    await oThis._validateTokenUser();
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
          internal_error_identifier: 'a_s_u_r_b_1',
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
   * @returns {Promise<void>}
   * @private
   */
  async _setRedemptionUuids() {
    throw new Error('Sub-class to implement.');
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
    const UserSaltEncryptorKeyCache = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'UserSaltEncryptorKeyCache');

    const promisesArray = [
      new UserSaltEncryptorKeyCache({ tokenId: oThis.tokenId }).fetchDecryptedData(),
      new RedemptionsByIdCache({
        uuids: oThis.redemptionUuids
      }).fetch()
    ];

    const promisesResponse = await Promise.all(promisesArray);

    const encryptionSalt = promisesResponse[0].data.encryption_salt_d;
    const redemptionsMap = promisesResponse[1].data;

    for (let index = 0; index < oThis.redemptionUuids.length; index++) {
      const redemptionDetail = redemptionsMap[oThis.redemptionUuids[index]];

      if (
        redemptionDetail &&
        redemptionDetail.userUuid &&
        redemptionDetail.userUuid.toLowerCase() === oThis.userId.toLowerCase()
      ) {
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
   * Return service response.
   *
   * @returns {Promise<>}
   * @private
   */
  async _prepareResponse() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = UserRedemptionBase;
