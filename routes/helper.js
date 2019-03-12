/**
 * Route helper class.
 *
 * @module routes/helper
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '..',
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  ApiParamsValidator = require(rootPrefix + '/lib/validators/ApiParams'),
  ConfigCrudByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  emailNotifier = require(rootPrefix + '/lib/notifier'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for routes helper.
 *
 * @class RoutesHelper
 */
class RoutesHelper {
  /**
   * Perform
   *
   * @param req
   * @param res
   * @param next
   * @param serviceGetter : in case of getting from ic, this is the getter name. else it is relative path in app root folder
   * @param errorCode
   * @param afterValidationCallback
   * @param formatter
   *
   * @return {Promise<T>}
   */
  static perform(req, res, next, serviceGetter, errorCode, afterValidationCallback, formatter) {
    const oThis = this,
      errorConfig = basicHelper.fetchErrorConfig(req.decodedParams.apiVersion);

    return oThis.asyncPerform(req, res, next, serviceGetter, afterValidationCallback, formatter).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        error.renderResponse(res, errorConfig);
      } else {
        emailNotifier.perform(errorCode, 'Something went wrong.', error, {});
        logger.error(errorCode, 'Something went wrong', error);

        responseHelper
          .error({
            internal_error_identifier: errorCode,
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          })
          .renderResponse(res, errorConfig);
      }
    });
  }

  /**
   * Async Perform
   *
   * @param req
   * @param res
   * @param next
   * @param serviceGetter
   * @param afterValidationCallback
   * @param formatter
   *
   * @return {Promise<*>}
   */
  static async asyncPerform(req, res, next, serviceGetter, afterValidationCallback, formatter) {
    req.decodedParams = req.decodedParams || {};

    const oThis = this,
      errorConfig = basicHelper.fetchErrorConfig(req.decodedParams.apiVersion);

    if (
      req.decodedParams.app_validated_api_name != apiName.allInternalRoutes &&
      req.decodedParams.app_validated_api_name != req.decodedParams.apiName
    ) {
      return responseHelper
        .error({
          internal_error_identifier: 'h_ap_1',
          api_error_identifier: 'unauthorized_api_request',
          debug_options: {
            app_validated_api_name: req.decodedParams.app_validated_api_name,
            apiName: req.decodedParams.apiName
          }
        })
        .renderResponse(res, errorConfig);
    }

    const apiParamsValidatorRsp = await new ApiParamsValidator({
      api_name: req.decodedParams.apiName,
      api_version: req.decodedParams.apiVersion,
      api_params: req.decodedParams
    }).perform();

    req.serviceParams = apiParamsValidatorRsp.data.sanitisedApiParams;

    if (afterValidationCallback) {
      req.serviceParams = await afterValidationCallback(req.serviceParams);
    }

    let handleResponse = async function(response) {
      if (response.isSuccess() && formatter) {
        // if required, this function could reformat data as per API version requirements.
        // NOTE: This method should modify response.data
        await formatter(response);
      }

      response.renderResponse(res, errorConfig);
    };

    let Service;

    if (req.decodedParams.clientConfigStrategyRequired) {
      const configStrategy = await oThis._fetchConfigStrategyByClientId(req.serviceParams['client_id']),
        instanceComposer = new InstanceComposer(configStrategy);

      Service = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, serviceGetter);
    } else {
      Service = require(rootPrefix + serviceGetter);
    }

    return new Service(req.serviceParams).perform().then(handleResponse);
  }

  /**
   * Fetch config strategy by client id
   *
   * @param clientId
   *
   * @return {Promise<*>}
   *
   * @private
   */
  static async _fetchConfigStrategyByClientId(clientId) {
    let configCrudByClientId = new ConfigCrudByClientId(clientId),
      configStrategyRsp = await configCrudByClientId.get();

    if (configStrategyRsp.isFailure()) {
      return Promise.reject(configStrategyRsp);
    }

    return configStrategyRsp.data;
  }
}

module.exports = RoutesHelper;
