const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/UserSaltEncryptorKey');
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserRedemptionsByUuid');

/**
 * Class to fetch user redemption.
 *
 * @class GetUserRedemption
 */
class UserRedemptionGet extends ServiceBase {
  /**
   * Constructor to fetch user redemption.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {string} params.user_id
   * @param {string} params.user_redemption_uuid
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;

    oThis.userId = params.user_id;
    oThis.userRedemptionUuid = params.user_redemption_uuid;
    oThis.userRedemption = {};
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

    await oThis._fetchRedemption();

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
          internal_error_identifier: 'a_s_u_r_g_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: { userId: oThis.userId, tokenId: oThis.tokenId }
        })
      );
    }
  }

  /**
   * Fetch redemption.
   *
   * @sets oThis.userRedemption
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchRedemption() {
    const oThis = this;

    const RedemptionsByIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid');

    const cacheResponse = await new RedemptionsByIdCache({
      uuids: [oThis.userRedemptionUuid]
    }).fetch();
    if (cacheResponse.isFailure()) {
      return Promise.reject(cacheResponse);
    }

    oThis.userRedemption = cacheResponse.data[oThis.userRedemptionUuid];

    if (!CommonValidators.validateObject(oThis.userRedemption)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_g_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_user_redemption_uuid'],
          debug_options: { userId: oThis.userId, tokenId: oThis.tokenId, userRedemptionUuid: oThis.userRedemptionUuid }
        })
      );
    }

    if (oThis.userRedemption.userUuid !== oThis.userId) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_g_3',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: { userId: oThis.userId, tokenId: oThis.tokenId, userRedemptionUuid: oThis.userRedemptionUuid }
        })
      );
    }

    await oThis._decryptEmail();
  }

  /**
   * Decrypt email.
   *
   * @sets oThis.userRedemption
   *
   * @returns {Promise<void>}
   * @private
   */
  async _decryptEmail() {
    const oThis = this;

    if (oThis.userRedemption.emailAddress) {
      const UserSaltEncryptorKeyCache = oThis
          .ic()
          .getShadowedClassFor(coreConstants.icNameSpace, 'UserSaltEncryptorKeyCache'),
        encryptionSaltResp = await new UserSaltEncryptorKeyCache({ tokenId: oThis.tokenId }).fetchDecryptedData();

      const encryptionSalt = encryptionSaltResp.data.encryption_salt_d;

      oThis.userRedemption.emailAddress = await new AddressesEncryptor({ encryptionSaltD: encryptionSalt }).decrypt(
        oThis.userRedemption.emailAddress
      );
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
      [resultType.userRedemption]: oThis.userRedemption
    });
  }
}

InstanceComposer.registerAsShadowableClass(UserRedemptionGet, coreConstants.icNameSpace, 'UserRedemptionGet');

module.exports = {};
