'use strict';
/**
 * This service helps in fetching user from our system.
 *
 * @module app/services/user/Get
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class to get user.
 *
 * @class
 */
class Get extends ServiceBase {
  /**
   * Constructor for getting user
   *
   * @param params
   * @param {Number} params.client_id: client Id
   * @param {Number} params.token_id: token Id
   * @param {String} params.user_id: user Id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
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
          internal_error_identifier: 'a_s_u_g_1',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData({ [resultType.user]: response.data[oThis.userId] }));
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _fetchUser() {
    const oThis = this,
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] });

    return tokenUserDetailsCacheObj.fetch();
  }
}

InstanceComposer.registerAsShadowableClass(Get, coreConstants.icNameSpace, 'GetUser');

module.exports = {};
