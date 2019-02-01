'use strict';

/*
 * This service helps in fetching user from our system
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class GetUser extends ServiceBase {
  /**
   * @constructor
   *
   * @param params
   * @param params.client_id              {Number} - client Id
   * @param params.user_id              {String} - user_id (user Id)
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    if (!oThis.tokenId) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'a_s_tu_gu_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        })
      );
    }

    let response = await oThis._fetchUser();

    return Promise.resolve(response);
  }

  /**
   * _fetchTokenDetails - fetch token details from cache
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    let tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    let response = await tokenCache.fetch();

    oThis.tokenId = response.data.id;
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

InstanceComposer.registerAsShadowableClass(GetUser, coreConstants.icNameSpace, 'GetUser');

module.exports = {};
