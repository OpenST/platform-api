'use strict';

/*
 * This service helps in fetching user from our system
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class Get extends ServiceBase {
  /**
   * @constructor
   *
   * @param params
   * @param params.client_id {Number} - client Id
   * @param params.token_id {Number} - token Id
   * @param params.user_id {String} - user_id (user Id)
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
   * createUser - Creates new user
   *
   * @return {Promise<string>}
   */
  async _fetchUser() {
    const oThis = this,
      TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] });

    return tokenUserDetailsCacheObj.fetch();
  }
}

InstanceComposer.registerAsShadowableClass(Get, coreConstants.icNameSpace, 'GetUser');

module.exports = {};
