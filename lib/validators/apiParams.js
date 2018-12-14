'use strict';

/**
 * This class is for validating the api params.
 *
 * @module lib/validators/apiParams
 *
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  v2Config = require(rootPrefix + '/config/apiParams/v2/signature'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  internalConfig = require(rootPrefix + '/config/apiParams/internal/signature');

class ApiParamsValidator {

  /**
   *
   * @constructor
   *
   * @param {object} params
   * @param {boolean} params.api_name - human readable name of API Fired - used for finding the mandatory and optional params
   * @param {boolean} params.api_version - API Version
   * @param {object} params.api_params - object containing Params sent in request
   */
  constructor(params){
    const oThis = this;

    oThis.apiName = params.api_name;
    oThis.apiVersion = params.api_version;
    oThis.apiParams = params.api_params;

    oThis.paramsConfig = null;
    oThis.sanitisedApiParams = {};
  }

  /**
   * Perform
   *
   * @return {promise<result>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchParamsConfig();

    await oThis._validateMandatoryParams();

    await oThis._checkOptionalParams();

    return responseHelper.successWithData({ sanitisedApiParams: oThis.sanitisedApiParams });
  }

  /**
   * Fetch Params Config for an API
   *
   * @private
   *
   * Sets oThis.paramsConfig
   *
   * @return {Promise<result>}
   */
  async _fetchParamsConfig() {
    const oThis = this;

    let versionConfig = {};

    if (oThis.apiVersion === apiVersions.v2) {
      versionConfig = v2Config;
    } else if (oThis.apiVersion === apiVersions.internal) {
      versionConfig = internalConfig;
    } else {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_v_ap_2',
          api_error_identifier: 'invalid_api_version',
          debug_options: {}
        })
      );
    }

    oThis.paramsConfig = versionConfig[oThis.apiName];

    if (!oThis.paramsConfig) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_v_ap_3',
          api_error_identifier: 'invalid_api_name',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * Fetch Config for an API
   *
   * @private
   *
   * @return {result}
   */
  async _validateMandatoryParams() {
    const oThis = this,
      mandatoryKeys = oThis.paramsConfig.mandatory || [],
      paramErrors = [];

    let hasError = false;

    for (let i = 0; i < mandatoryKeys.length; i++) {
      let whiteListedKeyData = mandatoryKeys[i],
        whiteListedKey = whiteListedKeyData.parameter;

      if (
        oThis.apiParams.hasOwnProperty(whiteListedKey) &&
        oThis.apiParams[whiteListedKey] !== undefined &&
        oThis.apiParams[whiteListedKey] !== null
      ) {
        oThis.sanitisedApiParams[whiteListedKey] = oThis.apiParams[whiteListedKey];
      } else {
        paramErrors.push(whiteListedKeyData.error_identifier);
        hasError = true;
      }
    }

    if (hasError) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'v_ap_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: paramErrors,
          error_config: basicHelper.fetchErrorConfig(oThis.apiVersion),
          debug_options: {}
        })
      );
    } else {
      return Promise.resolve(responseHelper.successWithData({}));
    }
  }

  /**
   * Check optional params
   *
   * @private
   *
   * @return {result}
   */
  async _checkOptionalParams() {
    const oThis = this,
      optionalKeys = oThis.paramsConfig.optional || [];

    for (let i = 0; i < optionalKeys.length; i++) {
      let whiteListedKey = optionalKeys[i];
      if (oThis.apiParams.hasOwnProperty(whiteListedKey)) {
        oThis.sanitisedApiParams[whiteListedKey] = oThis.apiParams[whiteListedKey];
      }
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

}

module.exports = ApiParamsValidator;
