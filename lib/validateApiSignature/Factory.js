/**
 * Module to validate API signature.
 *
 * @module lib/validateApiSignature/Factory
 */

const rootPrefix = '../..',
  ReplayAttackCache = require(rootPrefix + '/lib/cacheManagement/shared/ReplayAttack'),
  AuthenticateApiByApiKeySecret = require(rootPrefix + '/lib/validateApiSignature/ByApiKeySecret'),
  AuthenticateApiByPersonalSign = require(rootPrefix + '/lib/validateApiSignature/ByPersonalSign'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiAuthentication = require(rootPrefix + '/config/apiAuthentication'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  environmentInfo = require(rootPrefix + '/lib/globalConstant/environmentInfo');

// Declare variables.
const errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2);

/**
 * Class to validate API signature.
 *
 * @class Factory
 */
class Factory {
  /**
   * Constructor to validate API signature.
   *
   * @param {object} params
   * @param {object} params.inputParams: Params sent in API call
   * @param {string} params.inputParams.api_signature_kind: algorithm of signature
   * @param {string} params.requestPath: path of the url called
   * @param {string} params.requestMethod: POST / GET / DELETE
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
   * Main performer of class.
   *
   * @return {Promise<any>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error(`${__filename}::perform::catch`);
      logger.error(error);

      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_vas_f_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error.toString() }
        })
      );
    });
  }

  /**
   * Perform validation.
   *
   * @return {Promise}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    logger.debug('apiAuthentication: 1');

    const matchData = await oThis._validateParams();

    logger.debug('apiAuthentication: 2');

    await oThis._checkIfReplayAttack(matchData.data);

    let response;

    switch (oThis.inputParams.api_signature_kind) {
      case apiSignature.hmacKind:
        response = await new AuthenticateApiByApiKeySecret({
          inputParams: oThis.inputParams,
          requestPath: oThis.requestPath
        }).perform();
        break;
      case apiSignature.personalSignKind:
        response = await new AuthenticateApiByPersonalSign({
          inputParams: oThis.inputParams,
          requestPath: oThis.requestPath,
          urlParams: matchData.data.urlParams
        }).perform();
        break;
      default:
        throw new Error(
          `Unreachable code -> validations already exist above this -> ${oThis.inputParams.api_signature_kind}`
        );
    }

    logger.debug('apiAuthentication: completed');

    if (response.isSuccess()) {
      response.data.appValidatedApiName = matchData.data.apiName;
    }

    return response;
  }

  /**
   * Check if current request is a replay attack.
   *
   * @param matchData
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _checkIfReplayAttack(matchData) {
    const oThis = this;

    if (matchData.disableReplayAttackCheck) {
      return;
    }

    // Replay attack validation to be done only for POST requests.
    if (oThis.requestMethod !== apiSignature.postRequestKind) {
      return;
    }

    const replayAttackCache = new ReplayAttackCache({
      signature: oThis.inputParams.api_signature
    });

    const response = await replayAttackCache.fetch();

    if (response.isFailure()) {
      return oThis._paramValidationError('l_vas_f_6', ['invalid_api_signature']);
    }
  }

  /**
   * Validate presence of mandatory params.
   *
   * @return {Promise}
   */
  _validateParams() {
    const oThis = this;

    logger.debug('apiAuthentication: 3');

    // Validate api_signature_kind.
    if (!apiSignature.supportedKinds.includes(oThis.inputParams.api_signature_kind)) {
      return oThis._paramValidationError('l_vas_f_2', ['invalid_api_signature_kind']);
    }

    let apiConfigs;

    if (oThis.requestMethod === apiSignature.getRequestKind) {
      apiConfigs = apiAuthentication.getRequestsDataExtractionRegex;
    } else if (oThis.requestMethod === apiSignature.postRequestKind) {
      apiConfigs = apiAuthentication.postRequestsDataExtractionRegex;
    } else if (oThis.requestMethod === apiSignature.deleteRequestKind) {
      apiConfigs = apiAuthentication.deleteRequestsDataExtractionRegex;
    } else {
      return oThis._apiError('l_vas_f_3', 'resource_not_found');
    }

    oThis._sanitizeUrl();

    logger.debug('apiAuthentication: 4');

    const matchData = oThis._matchAndExtract(apiConfigs);

    if (!matchData) {
      return oThis._apiError('l_vas_f_4', 'resource_not_found');
    }

    if (!matchData.supportedSignatureKinds.includes(oThis.inputParams.api_signature_kind)) {
      return oThis._paramValidationError('l_vas_f_5', ['unsupported_api_signature_kind']);
    }

    logger.debug('apiAuthentication: 5');

    return responseHelper.successWithData(matchData);
  }

  /**
   * Sanitize URL
   *
   * @sets oThis.sanitizedUrl
   *
   * @private
   */
  _sanitizeUrl() {
    const oThis = this;

    // Remove env prefix & version.
    // TODO: @Shlok: Discuss this.
    const regexExpressionStr = `\/${environmentInfo.urlPrefix}\/v[0-9.]*`,
      regexExpressionObj = new RegExp(regexExpressionStr, 'i');

    let sanitizedUrl = oThis.requestPath.replace(regexExpressionObj, '');

    // Remove query params.
    sanitizedUrl = sanitizedUrl.split('?')[0];

    // Add trailing slash.
    if (sanitizedUrl[sanitizedUrl.length - 1] !== '/') {
      sanitizedUrl += '/';
    }

    // Add beginning slash.
    if (sanitizedUrl[0] !== '/') {
      sanitizedUrl = '/' + sanitizedUrl;
    }

    oThis.sanitizedUrl = sanitizedUrl;
  }

  /**
   * Iterate over all routes & regexes to find match.
   *
   * @param {array} apiConfigs
   *
   * @return {*}
   * @private
   */
  _matchAndExtract(apiConfigs) {
    const oThis = this;

    let matchUrl = null,
      matchObj;

    for (let index = 0; index < apiConfigs.length; index++) {
      const urlApiConfig = apiConfigs[index];

      // Check request url matched or not
      // Check supported kind matched or not
      // Check dynamic variables length matched or not
      if (
        (matchObj = oThis.sanitizedUrl.match(urlApiConfig.regExUrl)) &&
        urlApiConfig.supportedSignatureKinds.includes(oThis.inputParams.api_signature_kind)
      ) {
        matchUrl = {
          apiName: urlApiConfig.apiName,
          url: urlApiConfig.url,
          supportedSignatureKinds: urlApiConfig.supportedSignatureKinds,
          disableReplayAttackCheck: urlApiConfig.disableReplayAttackCheck || 0,
          urlParams: {}
        };

        for (let regexMatchIndex = 0; regexMatchIndex < urlApiConfig.regExMatches.length; regexMatchIndex++) {
          matchUrl.urlParams[urlApiConfig.regExMatches[regexMatchIndex]] = matchObj[regexMatchIndex];
        }

        break;
      }
    }

    return matchUrl;
  }

  /**
   * Return parameters validation error.
   *
   * @param {string} code
   * @param {array} paramErrors
   *
   * @return {Promise<never>}
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
   * Return API error.
   *
   * @param {string} code
   * @param {string} apiErrorIdentifier
   *
   * @return {Promise<never>}
   */
  _apiError(code, apiErrorIdentifier) {
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
