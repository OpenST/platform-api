'use strict';

/*
  * Validate signature of Api request
  *
  * * Author: Puneet
  * * Date: 21/02/2019
  * * Reviewed by:
*/

const queryString = require('query-string');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ApiCredentialCache = require(rootPrefix + '/lib/sharedCacheManagement/ApiCredential'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  environmentInfo = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

class ValidateApiSignature {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.input_params - Params sent in API call
   * @param {String} params.request_path - path of the url called
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.inputParams = params.input_params;
    oThis.reqPath = params.request_path;

    oThis.currentTimestamp = null;
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
            internal_error_identifier: 'l_a_vas_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
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

    await oThis._validateParams();

    await oThis._validateRequestTime();

    return oThis._validateSignature();
  }

  /**
   * Validate presence of Mandatory params
   *
   * @return {Promise}
   */
  _validateParams() {
    const oThis = this,
      paramErrors = [];

    if (oThis.inputParams['signature_kind'] !== apiSignature.hmacKind) {
      paramErrors.push('invalid_signature_kind');
    }

    if (!CommonValidators.validateTimestamp(oThis.inputParams['request_timestamp'])) {
      paramErrors.push('invalid_request_timestamp');
    }

    if (!CommonValidators.validateApiKey(oThis.inputParams['api_key'])) {
      paramErrors.push('invalid_api_key');
    }

    //TODO: Add more rigid check after observing signatures which are generated
    if (!CommonValidators.validateString(oThis.inputParams['signature'])) {
      paramErrors.push('invalid_api_signature');
    }

    if (!CommonValidators.validateApiRequestPath(oThis.reqPath)) {
      paramErrors.push('invalid_request_path');
    }

    if (paramErrors.length > 0) {
      return oThis._validationError(paramErrors);
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Validate Request Time
   *
   * @return {*}
   */
  _validateRequestTime() {
    const oThis = this;

    let currentTime = Math.floor(new Date().getTime() / 1000);

    // API signature is valid for 10 seconds
    if (currentTime > parseInt(oThis.inputParams['request_timestamp']) + 10) {
      return oThis._validationError(['expired_request_timestamp']);
    }

    return Promise.resolve(responseHelper.successWithData());
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
    delete oThis.inputParams.signature;

    let queryParamsString = queryString.stringify(oThis.inputParams, { arrayFormat: 'bracket' }).replace(/%20/g, '+');

    // remove version prefix & sub-env specific prefix from URL
    let regexExpressionStr = `\/${environmentInfo.urlPrefix}\/v[0-9.]*`,
      regexExpressionObj = new RegExp(regexExpressionStr);

    let inputString = oThis.reqPath.replace(regexExpressionObj, '') + '?' + queryParamsString;

    let computedSignature = localCipher.generateApiSignature(inputString, apiCredentialsFetchRsp.data['apiSecret']);

    if (computedSignature !== signature) {
      return oThis._validationError(['invalid_api_signature']);
    }

    return Promise.resolve(responseHelper.successWithData({ clientId: apiCredentialsFetchRsp.data['clientId'] }));
  }

  /**
   *
   * @param {array} paramErrors
   *
   * @return {Promise}
   */
  _validationError(paramErrors) {
    const oThis = this;
    return Promise.reject(
      responseHelper.error({
        internal_error_identifier: 'l_a_vas_2',
        api_error_identifier: 'invalid_params',
        params_error_identifiers: paramErrors,
        error_config: errorConfig,
        debug_options: {
          inputParams: oThis.inputParams
        }
      })
    );
  }

  /**
   *
   * @return {number}
   * @private
   */
  _currentTimeStamp() {
    const oThis = this;
    if (oThis.currentTimestamp) return oThis.currentTimestamp;
    oThis.currentTimestamp = Math.floor(new Date().getTime() / 1000);
    return oThis.currentTimestamp;
  }
}

module.exports = ValidateApiSignature;
