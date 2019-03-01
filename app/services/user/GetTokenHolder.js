'use strict';
/**
 * Get token holder for a user.
 *
 * @module app/services/user/GetTokenHolder
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class to get token holder.
 *
 * @class
 */
class GetTokenHolder extends ServiceBase {
  /**
   * Constructor to get token holder.
   *
   * @param {Object} params
   * @param {String} params.user_id
   * @param {String/Number} params.client_id
   * @param {String/Number} [params.token_id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.user_id;
    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
  }

  /**
   * Async performer
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis.userId = oThis.userId.toLowerCase();

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    let response = await oThis._fetchUser();

    if (!CommonValidators.validateObject(response.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_gth_1',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_user_id'],
          debug_options: {}
        })
      );
    }
    response = response.data[oThis.userId];

    let responseEntity = {
      userId: response.userId,
      address: response.tokenHolderAddress,
      status: response.status, // This is the integer value of the status. User formatter converts this to a string at the end.
      updatedTimestamp: response.updatedTimestamp
    };

    return Promise.resolve(responseHelper.successWithData({ [resultType.user]: responseEntity }));
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<String>}
   *
   * @private
   */
  async _fetchUser() {
    const oThis = this,
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] });

    return tokenUserDetailsCacheObj.fetch();
  }
}

InstanceComposer.registerAsShadowableClass(GetTokenHolder, coreConstants.icNameSpace, 'GetTokenHolder');

module.exports = {};
