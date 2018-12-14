'use strict';

/*
  * Validate signature of Api request
  *
  * * Author: Pankaj
  * * Date: 18/01/2018
  * * Reviewed by:
*/

const queryString = require('query-string');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  clientSecretsCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/client_secrets'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

class ValidateSignature {

  constructor() {}

  static perform(inputParams, reqUrl) {
    const oThis = this;

    return oThis.asyncPerform(inputParams, reqUrl).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 'l_a_vs_7',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          })
        );
      }
    });

  }

  // Perform validation
  static async asyncPerform(inputParams, reqUrl) {

    const oThis = this;

    await oThis.mandatoryParamsPresent(inputParams);

    await oThis.validateRequestTime(inputParams['request_timestamp']);

    return oThis.validateParams(inputParams, reqUrl);
  }

  // Validate Mandatory params
  static mandatoryParamsPresent(inputParams) {
    if (!inputParams['signature'] || !inputParams['request_timestamp'] || !inputParams['api_key']) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vs_1',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig
        })
      );
    }
    return Promise.resolve(responseHelper.successWithData());
  }

  // Validate Mandatory params
  static validateRequestTime(requestTime) {
    var currentTime = Math.floor(new Date().getTime() / 1000);
    if (currentTime > parseInt(requestTime) + 10) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vs_2',
          api_error_identifier: 'invalid_or_expired_token',
          error_config: errorConfig
        })
      );
    }
    return Promise.resolve(responseHelper.successWithData());
  }

  static async validateParams(inputParams, reqUrl) {
    var obj = new clientSecretsCacheKlass({ api_key: inputParams['api_key'], useObject: true });
    var clientKeys = await obj.fetch();
    if (clientKeys.isFailure()) {
      return Promise.reject(clientKeys);
    }

    var currentTimeStamp = Math.floor(new Date().getTime() / 1000);
    if (clientKeys.data['expiryTimestamp'] < currentTimeStamp) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vs_3',
          api_error_identifier: 'client_api_credentials_expired',
          error_config: errorConfig
        })
      );
    }

    const signature = inputParams['signature'];
    delete inputParams.signature;

    var queryParamsString = queryString.stringify(inputParams, { arrayFormat: 'bracket' }).replace(/%20/g, '+');

    // remove version prefix from URL that
    var inputString = reqUrl.replace(/\/v[0-9.]*/g, '') + '?' + queryParamsString;

    var secretKey = await localCipher.decrypt(coreConstants.CACHE_SHA_KEY, clientKeys.data['apiSecret']);
    var computedSignature = localCipher.generateApiSignature(inputString, secretKey);

    if (computedSignature != signature) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_a_vs_6',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData({ clientId: clientKeys.data['clientId'] }));
  }


}

module.exports = ValidateSignature;
