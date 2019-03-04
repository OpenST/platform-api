'use strict';
/**
 * This service helps in fetching user salt from our system.
 *
 * @module app/services/user/UserSalt
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserSalts');
require(rootPrefix + '/lib/cacheManagement/chain/UserSaltEncryptorKey');

/**
 * Class to get user salt.
 *
 * @class
 */
class GetUserSalt extends ServiceBase {
  /**
   * Constructor for getting user
   *
   * @param params
   * @param {Number} params.client_id: client Id
   * @param {String} params.user_id: user Id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id.toLowerCase();

    oThis.userData = null;
  }

  /**
   * Main performer for the class.
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._fetchUser();

    await oThis._decryptUserSalt();

    return Promise.resolve(responseHelper.successWithData({ [resultType.salt]: oThis.userData }));
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _fetchUser() {
    const oThis = this,
      TokenUserSaltsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserSaltsCache'),
      tokenUserSaltsCacheObj = new TokenUserSaltsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] });

    let response = await tokenUserSaltsCacheObj.fetch();

    if (!CommonValidators.validateObject(response.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_gus_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    oThis.userData = response.data[oThis.userId];
  }

  /**
   * Decrypt salt from Dynamo
   *
   * @returns {Promise<void>}
   * @private
   */
  async _decryptUserSalt() {
    const oThis = this;

    let UserSaltEncryptorKeyCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserSaltEncryptorKeyCache'),
      encryptionSaltResp = await new UserSaltEncryptorKeyCache({ tokenId: oThis.tokenId }).fetchDecryptedData();

    let encryptionSalt = encryptionSaltResp.data.encryption_salt_d;

    oThis.userData.salt = await new AddressesEncryptor({ encryptionSaltD: encryptionSalt }).decrypt(
      oThis.userData.salt
    );
  }
}

InstanceComposer.registerAsShadowableClass(GetUserSalt, coreConstants.icNameSpace, 'GetUserSalt');

module.exports = {};
