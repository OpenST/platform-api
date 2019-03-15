'use strict';

/**
 * Request Manager
 *
 * @module lib/request
 */
const queryString = require('query-string'),
  https = require('https'),
  http = require('http'),
  url = require('url');

const rootPrefix = '..',
  validate = require(rootPrefix + '/lib/validate'),
  version = require(rootPrefix + '/package.json').version,
  httpUserAgent = 'ost-sdk-js ' + version;

let DEBUG = 'true' === process.env.OST_SDK_DEBUG;

/**
 * Generate query signature
 * @param {string} resource - API Resource
 * @param {object} queryParams - resource query parameters
 * @param {object} requestParams - all params passed
 *
 * @return {string} - query parameters with signature
 *
 * @private @static
 */
function signQueryParams(resource, queryParams, requestParams) {
  console.log('resource', resource);
  console.log('queryParams', queryParams);
  console.log('requestParams', requestParams);

  let stringToSign = `${resource}?${queryParams}`;

  let Web3 = require('web3');
  let web3 = new Web3('http://127.0.0.1');
  web3.eth.accounts.wallet.add(requestParams.apiSignerPrivateKey);

  return (
    queryParams +
    '&signature=' +
    web3.eth.accounts.wallet[requestParams.apiSignerAddress].sign(stringToSign)['signature']
  );
}

/**
 * Request Manager constructor
 *
 * @param {object} params
 * @param {string} params.tokenId
 * @param {string} params.walletAddress
 * @param {string} params.apiSignerAddress
 * @param {string} params.apiEndpoint - version specific api endpoint
 *
 * @constructor
 */
const RequestKlass = function(params) {
  const oThis = this;

  // Validate token_id key
  if (!validate.isPresent(params.tokenId)) {
    throw new Error('tokenId not present.');
  } else if (!validate.isPresent(params.walletAddress)) {
    throw new Error('Api key not present.');
  } else if (!validate.isPresent(params.apiSignerAddress)) {
    throw new Error('Api key not present.');
  }

  console.log('params', params);

  oThis.apiEndpoint = params.apiEndpoint.replace(/\/$/, '');

  oThis._formatQueryParams = function(resource, queryParams) {
    const oThis = this;

    queryParams.token_id = params.tokenId;
    queryParams.wallet_address = params.walletAddress;
    queryParams.api_signer_address = params.apiSignerAddress;
    queryParams.signature_kind = 'OST1-PS';
    queryParams.request_timestamp = Math.round(new Date().getTime() / 1000);

    let formattedParams = queryString.stringify(queryParams, { arrayFormat: 'bracket' }).replace(/%20/g, '+');

    return signQueryParams(resource, formattedParams, params);
  };
};

RequestKlass.prototype = {
  /**
   * Send get request
   *
   * @param {string} resource - API Resource
   * @param {object} queryParams - resource query parameters
   *
   * @public
   */
  get: function(resource, queryParams) {
    const oThis = this;
    return oThis._send('GET', resource, queryParams);
  },

  /**
   * Send post request
   *
   * @param {string} resource - API Resource
   * @param {object} queryParams - resource query parameters
   *
   * @public
   */
  post: function(resource, queryParams) {
    const oThis = this;
    return oThis._send('POST', resource, queryParams);
  },

  /**
   * Get formatted query params
   *
   * @param {string} resource - API Resource
   * @param {object} queryParams - resource query parameters
   *
   * @return {string} - query parameters with signature
   *
   * @private
   */
  _formatQueryParams: function(resource, queryParams) {
    /**
     Note: This is just an empty function body.
     The Actual code has been moved to constructor.
     Modifying prototype._formatQueryParams will not have any impact.
     **/
  },

  /**
   * Get parsed URL
   *
   * @param {string} resource - API Resource
   *
   * @return {object} - parsed url object
   *
   * @private
   */
  _parseURL: function(resource) {
    const oThis = this;

    return url.parse(oThis.apiEndpoint + resource);
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
  _send: function(requestType, resource, queryParams) {
    const oThis = this,
      parsedURL = oThis._parseURL(resource),
      requestData = oThis._formatQueryParams(resource, queryParams);

    const options = {
      host: parsedURL.hostname,
      port: parsedURL.port,
      path: parsedURL.path,
      method: requestType,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': httpUserAgent
      }
    };

    if (requestType === 'GET' && validate.isPresent(requestData)) {
      options.path = options.path + '?' + requestData;
    }

    if (DEBUG) {
      console.log('------------------------------');
      console.log('request OPTIONS \n', JSON.stringify(options));
      console.log('requestData \n', requestData);
    }

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

          if (parsedResponse.success) {
            onResolve(parsedResponse);
          } else {
            onReject(parsedResponse);
          }
        });
      });

      request.on('error', function(e) {
        console.error('OST-SDK: Request error');
        console.error(e);
        var parsedResponse = oThis._parseResponse(e);
        if (parsedResponse.success) {
          onResolve(parsedResponse);
        } else {
          onReject(parsedResponse);
        }
      });

      //write data to server
      if (requestType === 'POST' && validate.isPresent(requestData)) {
        request.write(requestData);
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
  _parseResponse: function(responseData, response) {
    if (!validate.isPresent(responseData) || (response || {}).statusCode != 200) {
      switch ((response || {}).statusCode) {
        case 400:
          responseData =
            responseData ||
            '{"success": false, "err": {"code": "BAD_REQUEST", "internal_id": "SDK(BAD_REQUEST)", "msg": "", "error_data":[]}}';
          break;
        case 429:
          responseData =
            responseData ||
            '{"success": false, "err": {"code": "TOO_MANY_REQUESTS", "internal_id": "SDK(TOO_MANY_REQUESTS)", "msg": "", "error_data":[]}}';
          break;
        case 502:
          responseData =
            responseData ||
            '{"success": false, "err": {"code": "BAD_GATEWAY", "internal_id": "SDK(BAD_GATEWAY)", "msg": "", "error_data":[]}}';
          break;
        case 503:
          responseData =
            responseData ||
            '{"success": false, "err": {"code": "SERVICE_UNAVAILABLE", "internal_id": "SDK(SERVICE_UNAVAILABLE)", "msg": "", "error_data":[]}}';
          break;
        case 504:
          responseData =
            responseData ||
            '{"success": false, "err": {"code": "GATEWAY_TIMEOUT", "internal_id": "SDK(GATEWAY_TIMEOUT)", "msg": "", "error_data":[]}}';
          break;
        default:
          responseData =
            responseData ||
            '{"success": false, "err": {"code": "SOMETHING_WENT_WRONG", "internal_id": "SDK(SOMETHING_WENT_WRONG)", "msg": "", "error_data":[]}}';
      }
    }

    try {
      var parsedResponse = JSON.parse(responseData);
    } catch (e) {
      //console.error('OST-SDK: Response parsing error');
      //console.error(e);
      var parsedResponse = {
        success: false,
        err: {
          code: 'SOMETHING_WENT_WRONG',
          internal_id: 'SDK(SOMETHING_WENT_WRONG)',
          msg: 'Response parsing error',
          error_data: []
        }
      };
    }

    return parsedResponse;
  }
};

module.exports = RequestKlass;
