'use strict';

/*
  * Validate API signature
  *
  * * Author: Puneet
  * * Date: 21/02/2019
  * * Reviewed by:
*/

const rootPrefix = '../..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  environmentInfo = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  apiAuthentication = require(rootPrefix + '/config/apiAuthentication'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2),
  ByApiKeySecret = require(rootPrefix + '/lib/validateApiSignature/ByApiKeySecret'),
  ByPersonalSign = require(rootPrefix + '/lib/validateApiSignature/ByPersonalSign'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

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

    switch (oThis.inputParams['api_signature_kind']) {
      case apiSignature.hmacKind:
        return new ByApiKeySecret({
          inputParams: oThis.inputParams,
          requestPath: oThis.requestPath
        }).perform();
      case apiSignature.personalSignKind:
        return new ByPersonalSign({
          inputParams: oThis.inputParams,
          requestPath: oThis.requestPath,
          urlParams: matchData.urlParams
        }).perform();
      default:
        throw `oThis.inputParams['api_signature_kind'] ${oThis.inputParams['api_signature_kind']}`;
    }
  }

  /**
   * Validate presence of Mandatory params
   *
   * @return {Promise}
   */
  _validateParams() {
    const oThis = this,
      paramErrors = [];

    if (!apiSignature.supportedKinds.includes(oThis.inputParams['api_signature_kind'])) {
      paramErrors.push('invalid_api_signature_kind');
    }

    let apiConfigs;

    if (oThis.requestMethod === apiSignature.getRequestKind) {
      apiConfigs = apiAuthentication.getRequestsDataExtractionRegex;
    } else if (oThis.requestMethod === apiSignature.postRequestKind) {
      apiConfigs = apiAuthentication.postRequestsDataExtractionRegex;
    } else {
      paramErrors.push('invalid_request_path');
    }

    if (paramErrors.length > 0) {
      return oThis._validationError('l_vas_f_2', paramErrors);
    }

    oThis._sanitizeUrl();

    let matchData = oThis._matchAndExtract(apiConfigs);

    if (!matchData) {
      return oThis._validationError('l_vas_f_3', ['invalid_request_path']);
    }

    if (!matchData.supportedSignatureKinds.includes(oThis.inputParams['api_signature_kind'])) {
      return oThis._validationError('l_vas_f_4', ['unsupported_api_signature_kind']);
    }

    return responseHelper.successWithData(matchData);
  }

  _sanitizeUrl() {
    const oThis = this;

    // remove env prefix & version
    let regexExpressionStr = `\/${environmentInfo.urlPrefix}\/v[0-9.]*`,
      regexExpressionObj = new RegExp(regexExpressionStr);
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
      matchObj,
      apiConfig;

    for (let url in apiConfigs) {
      apiConfig = apiConfigs[url];
      if ((matchObj = oThis.sanitizedUrl.match(apiConfig.regExUrl))) {
        matchUrl = {
          apiName: apiConfig.apiName,
          url: url,
          supportedSignatureKinds: apiConfig.supportedSignatureKinds,
          urlParams: {}
        };
        for (let i = 0; i < apiConfig.regExMatches.length; i++) {
          matchUrl.urlParams[apiConfig.regExMatches[i]] = matchObj[i];
        }
        break;
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
  _validationError(code, paramErrors) {
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
}

module.exports = Factory;
