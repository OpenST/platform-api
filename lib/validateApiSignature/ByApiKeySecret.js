'use strict';

/*
  * Validate signature of Api request
  *
  * * Author: Puneet
  * * Date: 21/02/2019
  * * Reviewed by:
*/

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ApiCredentialCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ApiCredential'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  Base = require(rootPrefix + '/lib/validateApiSignature/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common');

class ByApiKeySecret extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.inputParams - Params sent in API call
   * @param {String} params.requestPath - path of the url called
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /***
   * Perform validation
   *
   * @return {Promise}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateParams();

    await oThis._validateRequestTime();

    return oThis._validateSignature();
  }

  /**
   * Validate presence of Mandatory params
   *
   * @return {Promise}
   */
  async _validateParams() {
    const oThis = this,
      paramErrors = [];

    await super._validateParams();

    if (!CommonValidators.validateApiKey(oThis.inputParams['api_key'])) {
      paramErrors.push('invalid_api_key');
    }

    //TODO: Add more rigid check after observing signatures which are generated
    if (!CommonValidators.validateString(oThis.inputParams['signature'])) {
      paramErrors.push('invalid_api_signature');
    }

    if (paramErrors.length > 0) {
      return oThis._validationError(paramErrors);
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

    let obj = new ApiCredentialCache({ apiKey: oThis.inputParams['api_key'] });
    let apiCredentialsFetchRsp = await obj.fetchDecryptedData();
    if (apiCredentialsFetchRsp.isFailure()) {
      return Promise.reject(apiCredentialsFetchRsp);
    }

    if (!apiCredentialsFetchRsp.data['expiryTimestamp']) {
      return oThis._validationError(['invalid_api_key']);
    } else if (apiCredentialsFetchRsp.data['expiryTimestamp'] < oThis._currentTimeStamp()) {
      return oThis._validationError(['expired_api_key']);
    }

    const signature = oThis.inputParams['signature'];

    let computedSignature = localCipher.generateApiSignature(
      oThis._stringToSign,
      apiCredentialsFetchRsp.data['apiSecret']
    );

    if (computedSignature !== signature) {
      return oThis._validationError(['invalid_api_signature']);
    }

    return Promise.resolve(responseHelper.successWithData({ clientId: apiCredentialsFetchRsp.data['clientId'] }));
  }

  get _signatureKind() {
    return apiSignature.hmacKind;
  }
}

module.exports = ByApiKeySecret;
