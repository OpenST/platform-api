'use strict';

/*
  * Validate api signature of Api request
*/

const crypto = require('crypto');

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class AuthenticateApiByWebhookKeySecret {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.inputParams - Params sent in API call
   * @param {Number} params.inputParams.api_key - api_key using which signature was generated
   * @param {Number} params.inputParams.api_request_timestamp - in seconds timestamp when request was signed
   * @param {String} params.inputParams.api_signature_kind - algo of signature
   * @param {String} params.inputParams.api_signature - signature generated after applying algo
   * @param {String} params.requestPath - path of the url called
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.inputParams = params.inputParams;
    oThis.reqPath = params.requestPath;
    oThis.requestHeaders = params.requestHeaders;
  }

  /**
   *
   * @return {Promise}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 'l_vas_bbbbbb_3',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: { error: error.toString() }
          })
        );
      }
    });
  }

  /***
   * Perform validation
   *
   * @return {Promise}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    console.log('I am in AuthenticateApiByWebhookKeySecret');
    return oThis._validateSignature();
  }

  /**
   *
   * Validate API Signature
   *
   * @return {Promise<*>}
   */
  async _validateSignature() {
    const oThis = this;

    logger.debug('apiAuthentication: ByApiKeySecretStep: 2');
    let apiSecret = '09121ae7614856777fa36d63aca828e0ef14be77fb48fa149e0c0b50fec847a7';
    const signature = oThis.requestHeaders['api-signature'];

    let computedSignature = oThis.generateApiSignature(oThis._stringToSign, apiSecret);

    logger.debug('apiAuthentication: ByApiKeySecretStep: 5', computedSignature);
    logger.debug('apiAuthentication: ByApiKeySecretStep: 6', signature);

    if (signature.indexOf(computedSignature) == -1) {
      return oThis._validationError('l_vas_baks_4', ['invalid_api_signature'], {
        computedSignature: computedSignature,
        signature: signature
      });
    }

    logger.debug('apiAuthentication: ByApiKeySecretStep: 6');

    return Promise.resolve(
      responseHelper.successWithData({
        apiSignatureKind: oThis._signatureKind
      })
    );
  }

  /**
   *
   * Generate String to Sign
   *
   * @return {string}
   * @private
   */
  get _stringToSign() {
    const oThis = this;

    return `${oThis.requestHeaders['api-request-timestamp']}.${oThis.requestHeaders['version']}.${JSON.stringify(
      oThis.inputParams
    )}`;
  }

  get _signatureKind() {
    return apiSignature.hmacKind;
  }

  generateApiSignature(stringParams, clientSecret) {
    var hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(stringParams);
    return hmac.digest('hex');
  }
}

module.exports = AuthenticateApiByWebhookKeySecret;
