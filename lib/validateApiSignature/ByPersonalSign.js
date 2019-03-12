'use strict';

/*
  * Validate API signature of Api request
*/

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  ConfigCrudByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  ECRecover = require(rootPrefix + '/app/services/verifySigner/ECRecover'),
  Base = require(rootPrefix + '/lib/validateApiSignature/Base'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

class ByPersonalSign extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.inputParams - Params sent in API call (query params or form POST params)
   * @param {Number} params.inputParams.api_key - api_key using which signature was generated
   *                                            (token_id.user_id.device_address.personal_sign_address)
   * @param {Number} params.inputParams.api_request_timestamp - in seconds timestamp when request was signed
   * @param {String} params.inputParams.api_signature_kind - algo of signature
   * @param {String} params.inputParams.api_signature - signature generated after applying algo
   * @param {Object} params.urlParams - Params which we extracted from URL
   * @param {String} params.requestPath - path of the url called
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.urlParams = params.urlParams;

    oThis.userId = null;
    oThis.tokenId = null;
    oThis.clientId = null;
    oThis.apiKeyWalletAddress = null;
    oThis.apiKeyPersonalSignAddress = null;
    oThis.ic = null;
    oThis.userData = null;
    oThis.userDeviceData = null;
    oThis.tokenShardDetails = null;
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

    if (
      !CommonValidators.validatePersonalSignApiKey(
        oThis.inputParams['api_key'],
        apiSignature.personalSignApiKeySeparator
      )
    ) {
      paramErrors.push('invalid_api_key');
    }

    if (!CommonValidators.validatePersonalSign(oThis.inputParams['api_signature'])) {
      paramErrors.push('invalid_api_signature');
    }

    if (paramErrors.length > 0) {
      return oThis._validationError('l_vas_bps_1', paramErrors);
    }

    let api_key_addresses = oThis.inputParams['api_key'].split(apiSignature.personalSignApiKeySeparator);
    oThis.tokenId = api_key_addresses[0];
    oThis.userId = api_key_addresses[1];
    oThis.apiKeyWalletAddress = api_key_addresses[2].toLowerCase();
    oThis.apiKeyPersonalSignAddress = api_key_addresses[3].toLowerCase();

    // NOTE: Don't remove this check before discussion with bigger group.
    // Right now we are saying that from device, one user can't access other user's data
    if (oThis.urlParams['user_id'] && oThis.userId !== oThis.urlParams['user_id']) {
      paramErrors.push('unauthorized_to_access_other_user_information');
    }

    if (paramErrors.length > 0) {
      return oThis._validationError('l_vas_bps_2', paramErrors);
    }

    let cacheResponse = await new TokenByTokenIdCache({ tokenId: oThis.tokenId }).fetch();
    if (cacheResponse.isFailure() || !cacheResponse.data) {
      return oThis._validationError('l_vas_bps_3', ['invalid_token_id']);
    }
    oThis.clientId = cacheResponse.data.clientId;

    let configStrategyRsp = await new ConfigCrudByClientId(oThis.clientId).get();

    oThis.ic = new InstanceComposer(configStrategyRsp.data);

    let TokenShardNumbersCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
    let tokenShardNumbersCache = new TokenShardNumbersCache({
      tokenId: oThis.tokenId
    });

    let response = await tokenShardNumbersCache.fetch();
    if (response.isFailure() || !response.data.user) {
      return oThis._validationError('l_vas_bps_4', ['token_not_setup']);
    }
    oThis.tokenShardDetails = response.data;

    let TokenUserDetailsCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCache = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId],
        shardNumber: oThis.tokenShardDetails[shardConstant.userEntityKind]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCache.fetch();

    if (!tokenUserDetailsCacheRsp.data || !tokenUserDetailsCacheRsp.data[oThis.userId]) {
      return oThis._validationError('l_vas_bps_5', ['invalid_user_id']);
    }
    oThis.userData = tokenUserDetailsCacheRsp.data[oThis.userId];

    let DeviceDetailCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache');
    let cacheFetchRsp = await new DeviceDetailCache({
      userId: oThis.userId,
      walletAddresses: [oThis.apiKeyWalletAddress],
      shardNumber: oThis.userData['deviceShardNumber']
    }).fetch();

    if (!cacheFetchRsp.data || !cacheFetchRsp.data[oThis.apiKeyWalletAddress]) {
      return oThis._validationError('l_vas_bps_6', ['invalid_api_key']);
    }
    oThis.userDeviceData = cacheFetchRsp.data[oThis.apiKeyWalletAddress];

    if (oThis.userDeviceData.personalSignAddress !== oThis.apiKeyPersonalSignAddress) {
      return oThis._validationError('l_vas_bps_7', ['invalid_api_key']);
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * Validate API Signature
   *
   * @return {Promise<*>}
   */
  async _validateSignature() {
    const oThis = this;

    let verifySignRsp = await new ECRecover({
      signer: oThis.apiKeyPersonalSignAddress,
      personal_sign: oThis.inputParams['api_signature'],
      message_to_sign: oThis._stringToSign
    }).perform();

    if (verifySignRsp.isFailure()) {
      return oThis._validationError('l_vas_bps_8', ['invalid_api_signature']);
    }

    return Promise.resolve(
      responseHelper.successWithData({
        clientId: oThis.clientId,
        tokenId: oThis.tokenId,
        userData: oThis.userData,
        tokenShardDetails: oThis.tokenShardDetails,
        apiSignatureKind: oThis._signatureKind
      })
    );
  }

  get _signatureKind() {
    return apiSignature.personalSignKind;
  }
}

module.exports = ByPersonalSign;
