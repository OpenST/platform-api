'use strict';

/*
  * Validate signature of Api request
  *
  * * Author: Puneet
  * * Date: 21/02/2019
  * * Reviewed by:
*/

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  ConfigCrudByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  ECRecover = require(rootPrefix + '/app/services/verifySigner/ECRecover'),
  Base = require(rootPrefix + '/lib/validateApiSignature/Base'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class ByPersonalSign extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.inputParams - Params sent in API call (query params or form POST params)
   * @param {Object} params.urlParams - Params which we extracted from URL
   * @param {String} params.requestPath - path of the url called
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.inputParams = params.inputParams;
    oThis.urlParams = params.urlParams;
    oThis.reqPath = params.requestPath;

    oThis.userId = null;
    oThis.tokenId = null;
    oThis.clientId = null;
    oThis.walletAddress = null;
    oThis.personalSignAddress = null;
    oThis.ic = null;
    oThis.userData = null;
    oThis.userDeviceData = null;
  }

  /**
   * Validate presence of Mandatory params
   *
   * @return {Promise}
   */
  async _validateParams() {
    const oThis = this,
      paramErrors = [];

    oThis.urlParams = oThis.urlParams || {};

    await super._validateParams();

    if (!CommonValidators.validatePersonalSign(oThis.inputParams['signature'])) {
      paramErrors.push('invalid_api_signature');
    }

    if (!CommonValidators.validateInteger(oThis.inputParams['token_id'])) {
      paramErrors.push('invalid_token_id');
    }
    oThis.tokenId = oThis.inputParams['token_id'];

    oThis.userId = (oThis.urlParams['user_id'] || oThis.inputParams['user_id']).toLowerCase();
    if (!CommonValidators.validateUuidV4(oThis.userId)) {
      paramErrors.push('invalid_user_id');
    }

    if (!CommonValidators.validatePersonalSign(oThis.inputParams['signature'])) {
      paramErrors.push('invalid_api_signature');
    }

    if (!CommonValidators.validateEthAddress(oThis.inputParams['wallet_address'])) {
      paramErrors.push('invalid_wallet_address');
    }
    oThis.walletAddress = oThis.inputParams['wallet_address'].toLowerCase();

    if (!CommonValidators.validateEthAddress(oThis.inputParams['personal_sign_address'])) {
      paramErrors.push('invalid_personal_sign_address');
    }
    oThis.personalSignAddress = oThis.inputParams['personal_sign_address'].toLowerCase();

    if (paramErrors.length > 0) {
      return oThis._validationError('l_vas_bps_1', paramErrors);
    }

    let cacheResponse = await new TokenByTokenIdCache({ tokenId: oThis.tokenId }).fetch();
    if (cacheResponse.isFailure() || !cacheResponse.data) {
      return oThis._validationError('l_vas_bps_2', ['invalid_token_id']);
    }
    oThis.clientId = cacheResponse.data.clientId;

    let configStrategyRsp = await new ConfigCrudByClientId(oThis.clientId).get();

    oThis.ic = new InstanceComposer(configStrategyRsp.data);

    let TokenUserDetailsCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCache = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCache.fetch();

    if (!tokenUserDetailsCacheRsp.data || !tokenUserDetailsCacheRsp.data[oThis.userId]) {
      return oThis._validationError('l_vas_bps_3', ['invalid_user_id']);
    }
    oThis.userData = tokenUserDetailsCacheRsp.data[oThis.userId];

    let DeviceDetailCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache');
    let cacheFetchRsp = await new DeviceDetailCache({
      userId: oThis.userId,
      walletAddresses: [oThis.walletAddress],
      shardNumber: oThis.userData['deviceShardNumber']
    }).fetch();

    if (!cacheFetchRsp.data || !cacheFetchRsp.data[oThis.walletAddress]) {
      return oThis._validationError('l_vas_bps_4', ['invalid_wallet_address']);
    }
    oThis.userDeviceData = cacheFetchRsp.data[oThis.walletAddress];

    if (oThis.userDeviceData.personalSignAddress !== oThis.personalSignAddress) {
      return oThis._validationError('l_vas_bps_5', ['invalid_personal_sign_address']);
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * Validate Signature
   *
   * @return {Promise<*>}
   */
  async _validateSignature() {
    const oThis = this;

    let verifySignRsp = await new ECRecover({
      signer: oThis.personalSignAddress,
      personal_sign: oThis.inputParams['signature'],
      message_to_sign: oThis._stringToSign
    }).perform();

    if (verifySignRsp.isFailure()) {
      return oThis._validationError('l_vas_bps_6', ['invalid_api_signature']);
    }

    return Promise.resolve(
      responseHelper.successWithData({
        clientId: oThis.clientId,
        tokenId: oThis.tokenId
      })
    );
  }

  get _signatureKind() {
    return apiSignature.personalSignKind;
  }
}

module.exports = ByPersonalSign;
