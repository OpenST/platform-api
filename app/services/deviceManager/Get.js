'use strict';
/**
 * This service fetches the device manager details for given user id  .
 *
 * @module app/services/deviceManager/Get
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  TokenDetailCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token');

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for token details.
 *
 * @class
 */
class Get extends ServiceBase {
  /**
   *
   * @constructor
   *
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._sanitizeParams();

    await oThis._setTokenId();

    await oThis._getUserDetailsFromDdb();

    return Promise.resolve(responseHelper.successWithData({ [resultType.deviceManager]: oThis.details }));
  }

  /**
   *
   * @private
   */
  _sanitizeParams() {
    const oThis = this;
    oThis.userId = oThis.userId.toLowerCase();
  }

  /**
   *
   * set token id if not passed in params
   *
   * @private
   */
  async _setTokenId() {
    const oThis = this;

    if (oThis.tokenId) {
      return;
    }

    let cacheResponse = await new TokenDetailCache({ clientId: oThis.clientId }).fetch();

    if (cacheResponse.isFailure() || !cacheResponse.data) {
      logger.error('Could not fetched token details.');
      return Promise.reject(cacheResponse);
    }

    oThis.tokenId = cacheResponse.data['id'];
  }

  /**
   * Get user device managers details for given token id.
   *
   * @return {Promise<*|result>}
   */
  async _getUserDetailsFromDdb() {
    const oThis = this;

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    let tokenUserDetailsCache = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCache.fetch();

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('Could not fetched token user details.');
      Promise.reject(tokenUserDetailsCacheRsp);
    }

    if (!tokenUserDetailsCacheRsp.data[oThis.userId]) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_g_1',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    oThis.details = tokenUserDetailsCacheRsp.data[oThis.userId];
  }

  async _getContractData() {
    const oThis = this;

    //add requirement and nonce to output from multisig contract
  }
}

InstanceComposer.registerAsShadowableClass(Get, coreConstants.icNameSpace, 'GetDeviceManager');
