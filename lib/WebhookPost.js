'use strict';

/**
 * Request Manager
 *
 * @module lib/request
 */
const queryString = require('qs'),
  crypto = require('crypto'),
  https = require('https'),
  http = require('http'),
  url = require('url'),
  API_SIGNATURE_KIND = 'OST1-WEBHOOK-HMAC-SHA256';

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common');

let DEBUG = 'true' === process.env.OST_SDK_DEBUG;

/**
 * Generate query signature
 * @param {object} queryParams - resource query parameters
 * @param {object} _apiCredentials - API credentials
 *
 * @return {string} - query parameters with signature
 *
 * @private @static
 */
function signQueryParams(queryParams, _apiCredentials, queryHeaders) {
  let api_signature = [];

  console.log('----_apiCredentials------', _apiCredentials);
  for (let i = 0; i < _apiCredentials.secrets.length; i++) {
    let secret = _apiCredentials.secrets[i];
    let buff = new Buffer.from(secret, 'utf8');
    let hmac = crypto.createHmac('sha256', buff);

    console.log('hmac---------', hmac);
    hmac.update(`${queryHeaders.api_request_timestamp}.${queryHeaders.version}.${queryParams}`);
    api_signature.push(hmac.digest('hex'));
  }

  return api_signature.join(',');
}

/**
 * Request Manager constructor
 *
 * @param {object} params
 * @param {string} params.apiSecrets - array of api secrets
 * @param {string} params.apiEndpoint - complete specific api endpoint
 * @param {string} params.apiVersion - API version
 * @param {obj} params.config - configurations like timeout
 *
 * @constructor
 */
const WebhookPostKlass = function(params) {
  const oThis = this,
    _apiCredentials = {};

  // Validate API secret
  if (CommonValidators.validateAlphaNumericStringArray(params.apiSecrets)) {
    _apiCredentials.secrets = params.apiSecrets;
  } else {
    throw new Error('Api secrets not present.');
  }

  oThis.apiEndpoint = params.apiEndpoint.replace(/\/$/, '');
  var config = params.config || {};
  oThis.timeOut = config.timeout * 1000 || 60000;
  oThis.requestHeaders = {
    api_request_timestamp: parseInt(Math.round(new Date().getTime() / 1000)),
    api_signature_kind: API_SIGNATURE_KIND,
    version: params.apiVersion,
    'Content-Type': 'application/json'
  };

  oThis._signRequest = function(queryParams) {
    const oThis = this;

    console.log('queryParams-------------', queryParams);
    oThis.requestHeaders['api_signature'] = signQueryParams(queryParams, _apiCredentials, oThis.requestHeaders);
  };
};

WebhookPostKlass.prototype = {
  /**
   * Send post request
   *
   * @param {object} queryParams - resource query parameters
   *
   * @public
   */
  post: function(queryParams) {
    const oThis = this;
    return oThis._send('POST', queryParams);
  },

  /**
   * Get formatted query params
   *
   * @param {object} queryParams - resource query parameters
   *
   * @return {string} - query parameters with signature
   *
   * @private
   */
  _signRequest: function(queryParams) {
    /**
     Note: This is just an empty function body.
     The Actual code has been moved to constructor.
     Modifying prototype._signRequest will not have any impact.
     **/
  },

  /**
   * Send request
   *
   * @param {string} requestType - API request type
   * @param {string} resource - API Resource
   * @param {object} queryParams - resource query parameters
   *
   * @private
   */
  _send: function(requestType, queryParams) {
    const oThis = this,
      parsedURL = url.parse(oThis.apiEndpoint);

    queryParams = JSON.stringify(queryParams);
    oThis._signRequest(queryParams);

    const options = {
      host: parsedURL.hostname,
      port: parsedURL.port,
      path: parsedURL.path,
      method: requestType,
      json: true,
      headers: oThis.requestHeaders
    };

    logger.debug('------------------------------');
    logger.debug('request OPTIONS \n', JSON.stringify(options));
    logger.debug('requestData \n', queryParams);

    return new Promise(async function(onResolve, onReject) {
      var chunkedResponseData = '';

      var request = (parsedURL.protocol === 'https:' ? https : http).request(options, function(response) {
        response.setEncoding('utf8');

        response.on('data', function(chunk) {
          chunkedResponseData += chunk;
        });

        response.on('end', function() {
          var parsedResponse = oThis._parseResponse(chunkedResponseData, response);
          if (DEBUG) {
            console.log('parsedResponse \n', JSON.stringify(parsedResponse));
            console.log('------------------------------');
          }
          onResolve(parsedResponse);
        });
      });

      request.on('socket', function(socket) {
        socket.setTimeout(oThis.timeOut);
        socket.on('timeout', function(e) {
          onReject({
            success: false,
            err: { code: 'GATEWAY_TIMEOUT', internal_id: 'TIMEOUT_ERROR', msg: '', error_data: [] }
          });
        });
      });

      request.on('error', function(e) {
        console.error('Mappy: Request error');
        console.error(e);
        var parsedResponse = oThis._parseResponse(e);
        onResolve(parsedResponse);
      });

      //write data to server
      if (requestType === 'POST' && CommonValidators.validateString(queryParams)) {
        request.write(queryParams);
      }
      request.end();
    });
  },

  /**
   * Parse response
   *
   * @param {string} responseData - Response data
   * @param {object} response - Response object
   *
   * @private
   */
  _parseResponse: function(responseData, httpResponse) {
    const oThis = this;
    console.log('-------1--------------------response---', httpResponse);

    if ((httpResponse || {}).statusCode == 200) {
      return responseHelper.successWithData(responseData || {});
    }

    try {
      var parsedResponse = JSON.parse(responseData);
      console.log('-------3--------------------parsedResponse---', parsedResponse);
    } catch (e) {
      console.error('error response parsing error: ', e);
      var parsedResponse = responseData;
    }

    return responseHelper.error({
      internal_error_identifier: 'l_wp_1',
      api_error_identifier: 'something_went_wrong',
      debug_options: { httpStatusCode: (httpResponse || {}).statusCode, errorData: parsedResponse }
    });
  }
};

module.exports = WebhookPostKlass;
