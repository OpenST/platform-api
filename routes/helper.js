'use strict';

const rootPrefix = '..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiParamsValidator = require(rootPrefix + '/lib/validators/apiParams'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  OSTBase = require("@openstfoundation/openst-base"),
  InstanceComposer = OSTBase.InstanceComposer;

class RouteMethods {

  static perform(req, res, next, CallerKlassGetter, errorCode, afterValidationFunc, dataFormatterFunc) {
    const oThis = this,
      errorConfig = basicHelper.fetchErrorConfig(req.decodedParams.apiVersion);

    return oThis
      .asyncPerform(req, res, next, CallerKlassGetter, afterValidationFunc, dataFormatterFunc)
      .catch(function(error) {
        if (responseHelper.isCustomResult(error)) {
          error.renderResponse(res, errorConfig);
        } else {
          //TODO:- temp change (remove this and use notify of platform)
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

  static async asyncPerform(req, res, next, CallerKlassGetter, afterValidationFunc, dataFormatterFunc) {
    req.decodedParams = req.decodedParams || {};

    const oThis = this,
      errorConfig = basicHelper.fetchErrorConfig(req.decodedParams.apiVersion);

    const apiParamsValidatorRsp = await new apiParamsValidator({
      api_name: req.decodedParams.apiName,
      api_version: req.decodedParams.apiVersion,
      api_params: req.decodedParams
    }).perform();

    req.serviceParams = apiParamsValidatorRsp.data.sanitisedApiParams;

    if (afterValidationFunc) {
      req.serviceParams = await afterValidationFunc(req.serviceParams);
    }

    // TODO: temp. remove in sometime
    logger.debug('req.serviceParams', req.serviceParams);
    logger.debug('req.decodedParams', req.decodedParams);

    var handleResponse = async function(response) {
      if (response.isSuccess() && dataFormatterFunc) {
        // if requires this function could reformat data as per API version requirements.
        await dataFormatterFunc(response);
      }

      response.renderResponse(res, errorConfig);
    };

    console.log('req.serviceParams====req.serviceParams=================================', req.serviceParams);

    let configStrategy = {};//await oThis._fetchConfigStrategy(req.serviceParams['client_id']);

    let instanceComposer = new InstanceComposer(configStrategy);

    let Klass = instanceComposer.getShadowedClassFor('saas::SaasNamespace', CallerKlassGetter);

    return new Klass(req.serviceParams).perform().then(handleResponse);
  }

  static replaceKey(data, oldKey, newKey) {
    if (!data.hasOwnProperty(oldKey)) {
      return data;
    }

    const keyValue = data[oldKey];
    delete data[oldKey];
    data[newKey] = keyValue;

    return data;
  }

  static async _fetchConfigStrategy(clientId) {

    let configStrategyHelper = new ConfigStrategyHelper(clientId),
      configStrategyRsp = await configStrategyHelper.get();

    if (configStrategyRsp.isFailure()) {
      return Promise.reject(configStrategyRsp);
    }

    return configStrategyRsp.data;
  }

}

module.exports = RouteMethods;
