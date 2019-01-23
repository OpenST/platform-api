'use strict';

/*
  * Validate signature of Api request
  *
  * * Author: Puneet
  * * Date: 21/02/2019
  * * Reviewed by:
*/

const queryString = require('query-string');

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ApiCredentialCache = require(rootPrefix + '/lib/sharedCacheManagement/ApiCredential'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  environmentInfo = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

class ValidateApiSignature {
  /***
   *
   * @param {Object} inputParams
   * @param {String} reqUrl
   */
  constructor(inputParams, reqUrl) {
    const oThis = this;

    oThis.inputParams = inputParams;
    oThis.reqUrl = reqUrl;
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

    await oThis._validatePresenceOfMandatoryParams();

    await oThis._validateDataTypesOfParams();

    await oThis.validateRequestTime();

    return oThis.validateSignature();
  }

  /**
   * Validate presence of Mandatory params
   *
   * @return {Promise}
   */
  _validatePresenceOfMandatoryParams() {
    const oThis = this;

    if (
      !oThis.inputParams['signature_kind'] ||
      !oThis.inputParams['signature'] ||
      !oThis.inputParams['request_timestamp'] ||
      !oThis.inputParams['api_key']
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vas_2',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig,
          debug_options: oThis.inputParams
        })
      );
    }

    if (oThis.inputParams['signature_kind'] !== apiSignature.hmacKind) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vas_3',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: 'invalid_signature_kind',
          error_config: errorConfig,
          debug_options: {
            signature_kind: oThis.inputParams['signature_kind']
          }
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Validate data types of params
   *
   * @return {Promise}
   */
  _validateDataTypesOfParams() {
    const oThis = this;

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Validate Request Time
   *
   * @return {*}
   */
  validateRequestTime() {
    const oThis = this;

    let currentTime = Math.floor(new Date().getTime() / 1000);

    // API signature is valid for 10 seconds
    if (currentTime > parseInt(oThis.inputParams['request_timestamp']) + 10) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vas_4',
          api_error_identifier: 'invalid_or_expired_token',
          error_config: errorConfig
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData());
  }

  /**
   *
   * Validate Signature
   *
   * @return {Promise<*>}
   */
  async validateSignature() {
    const oThis = this;

    let obj = new ApiCredentialCache({ apiKey: oThis.inputParams['api_key'] });
    let apiCredentialsFetchRsp = await obj.fetchDecryptedData();
    if (apiCredentialsFetchRsp.isFailure()) {
      return Promise.reject(apiCredentialsFetchRsp);
    }

    let currentTimeStamp = Math.floor(new Date().getTime() / 1000);
    if (apiCredentialsFetchRsp.data['expiryTimestamp'] < currentTimeStamp) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vas_5',
          api_error_identifier: 'client_api_credentials_expired',
          error_config: errorConfig
        })
      );
    }

    const signature = oThis.inputParams['signature'];
    delete oThis.inputParams.signature;

    let queryParamsString = queryString.stringify(oThis.inputParams, { arrayFormat: 'bracket' }).replace(/%20/g, '+');

    // remove version prefix & sub-env specific prefix from URL that
    let regexExpressionStr = `\/${environmentInfo.urlPrefix}\/v[0-9.]*`,
      regexExpressionObj = new RegExp(regexExpressionStr);

    let inputString = oThis.reqUrl.replace(regexExpressionObj, '') + '?' + queryParamsString;

    let computedSignature = localCipher.generateApiSignature(inputString, apiCredentialsFetchRsp.data['apiSecret']);

    if (computedSignature !== signature) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vas_6',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData({ clientId: apiCredentialsFetchRsp.data['clientId'] }));
  }
}

module.exports = ValidateApiSignature;
