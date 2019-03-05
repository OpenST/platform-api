'use strict';

/*
  * Validate API signature
*/

const rootPrefix = '../..',
  ByApiKeySecret = require(rootPrefix + '/lib/validateApiSignature/ByApiKeySecret'),
  ByPersonalSign = require(rootPrefix + '/lib/validateApiSignature/ByPersonalSign'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiAuthentication = require(rootPrefix + '/config/apiAuthentication'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  environmentInfo = require(rootPrefix + '/lib/globalConstant/environmentInfo');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2);

class Factory {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.inputParams - Params sent in API call
   * @param {String} params.inputParams.api_signature_kind - algo of signature
   * @param {String} params.requestPath - path of the url called
   * @param {String} params.requestMethod - POST / GET
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.inputParams = params.inputParams;
    oThis.requestPath = params.requestPath;
    oThis.requestMethod = params.requestMethod;
    oThis.sanitizedUrl = null;
  }

  /**
   * Perform
   *
   * @return {Promise<any>}
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
            internal_error_identifier: 'l_vas_f_1',
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

    let matchData = await oThis._validateParams();

    let response;

    switch (oThis.inputParams['api_signature_kind']) {
      case apiSignature.hmacKind:
        response = await new ByApiKeySecret({
          inputParams: oThis.inputParams,
          requestPath: oThis.requestPath
        }).perform();
        break;
      case apiSignature.personalSignKind:
        response = await new ByPersonalSign({
          inputParams: oThis.inputParams,
          requestPath: oThis.requestPath,
          urlParams: matchData.urlParams
        }).perform();
        break;
      default:
        throw `oThis.inputParams['api_signature_kind'] ${oThis.inputParams['api_signature_kind']}`;
    }

    if (response.isSuccess()) {
      response.data['appValidatedApiName'] = matchData.data.apiName;
    }
    return response;
  }

  /**
   * Check if current request is a replay attack
   * @return {Promise<void>}
   * @private
   */
  async _checkIfReplayAttack() {}

  /**
   * Validate presence of Mandatory params
   *
   * @return {Promise}
   */
  _validateParams() {
    const oThis = this;

    // validate api_signature_kind
    if (!apiSignature.supportedKinds.includes(oThis.inputParams['api_signature_kind'])) {
      return oThis._paramValidationError('l_vas_f_2', ['invalid_api_signature_kind']);
    }

    let apiConfigs;

    if (oThis.requestMethod === apiSignature.getRequestKind) {
      apiConfigs = apiAuthentication.getRequestsDataExtractionRegex;
    } else if (oThis.requestMethod === apiSignature.postRequestKind) {
      apiConfigs = apiAuthentication.postRequestsDataExtractionRegex;
    } else {
      return oThis._apiError('l_vas_f_3', 'resource_not_found');
    }

    oThis._sanitizeUrl();

    let matchData = oThis._matchAndExtract(apiConfigs);
    if (!matchData) {
      return oThis._apiError('l_vas_f_4', 'resource_not_found');
    }

    if (!matchData.supportedSignatureKinds.includes(oThis.inputParams['api_signature_kind'])) {
      return oThis._paramValidationError('l_vas_f_5', ['unsupported_api_signature_kind']);
    }

    return responseHelper.successWithData(matchData);
  }

  /**
   * Sanitize URL
   *
   * @private
   */
  _sanitizeUrl() {
    const oThis = this;

    // remove env prefix & version
    let regexExpressionStr = `\/${environmentInfo.urlPrefix}\/v[0-9.]*`,
      regexExpressionObj = new RegExp(regexExpressionStr, 'i');
    let sanitizedUrl = oThis.requestPath.replace(regexExpressionObj, '');

    // remove query params
    sanitizedUrl = sanitizedUrl.split('?')[0];

    // add trailing slash
    if (sanitizedUrl[sanitizedUrl.length - 1] !== '/') {
      sanitizedUrl = sanitizedUrl + '/';
    }

    // add begining slash
    if (sanitizedUrl[0] !== '/') {
      sanitizedUrl = '/' + sanitizedUrl;
    }

    oThis.sanitizedUrl = sanitizedUrl;
  }

  /**
   *
   * @param {object} apiConfigs
   * @return {*}
   * @private
   */
  _matchAndExtract(apiConfigs) {
    const oThis = this;

    let matchUrl = null,
      matchObj;

    for (let url in apiConfigs) {
      let urlApiConfigs = apiConfigs[url];

      for (let i = 0; i < urlApiConfigs.length; i++) {
        let urlApiConfig = urlApiConfigs[i];

        if (
          (matchObj = oThis.sanitizedUrl.match(urlApiConfig.regExUrl)) &&
          urlApiConfig.supportedSignatureKinds.includes(oThis.inputParams['api_signature_kind'])
        ) {
          matchUrl = {
            apiName: urlApiConfig.apiName,
            url: url,
            supportedSignatureKinds: urlApiConfig.supportedSignatureKinds,
            urlParams: {}
          };
          for (let i = 0; i < urlApiConfig.regExMatches.length; i++) {
            matchUrl.urlParams[urlApiConfig.regExMatches[i]] = matchObj[i];
          }
          break;
        }
      }
    }

    return matchUrl;
  }

  /**
   *
   * @param {string} code
   * @param {array} paramErrors
   *
   * @return {Promise}
   */
  _paramValidationError(code, paramErrors) {
    const oThis = this;
    return Promise.reject(
      responseHelper.paramValidationError({
        internal_error_identifier: code,
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
   * @param {string} code
   * @param {string} apiErrorIdentifier
   *
   * @return {Promise}
   */
  _apiError(code, apiErrorIdentifier) {
    const oThis = this;
    return Promise.reject(
      responseHelper.error({
        internal_error_identifier: code,
        api_error_identifier: apiErrorIdentifier,
        error_config: errorConfig
      })
    );
  }
}

module.exports = Factory;
