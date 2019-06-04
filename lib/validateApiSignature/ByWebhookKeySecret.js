'use strict';

/*
  * Validate api signature of Api request
*/

const queryString = require('qs');

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  Base = require(rootPrefix + '/lib/validateApiSignature/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class AuthenticateApiByWebhookKeySecret extends Base {
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
    let apiSecret = 'ssssssss';
    const signature = oThis.inputParams['api_signature'];

    let computedSignature = localCipher.generateApiSignature(oThis._stringToSign, apiSecret);

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

    delete oThis.inputParams.api_signature;

    let queryParamsString = queryString
      .stringify(oThis.inputParams, {
        arrayFormat: 'brackets',
        sort: function(a, b) {
          return a.localeCompare(b);
        }
      })
      .replace(/%20/g, '+');

    logger.debug('Validate api signature input: ', queryParamsString);

    return queryParamsString;
  }

  get _signatureKind() {
    return apiSignature.hmacKind;
  }
}

module.exports = AuthenticateApiByWebhookKeySecret;
