const queryString = require('qs'),
  https = require('https'),
  http = require('http'),
  url = require('url');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class HttpRequest {
  /**
   *
   * @param {Object} params
   * @param {string} params.resource
   * @param {Object} [params.header]
   * @param {boolean} [params.noFormattingRequired]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.resource = params.resource;
    oThis.header = params.header;
    oThis.noFormattingRequired = params.noFormattingRequired;
  }

  /**
   * Send get request
   *
   * @param {object} queryParams - resource query parameters
   *
   * @public
   */
  get(queryParams) {
    const oThis = this;
    if (!queryParams) {
      queryParams = {};
    }
    return oThis._send('GET', queryParams);
  }

  /**
   * Send post request
   *
   * @param {object} queryParams - resource query parameters
   *
   * @public
   */
  post(queryParams) {
    const oThis = this;
    if (!queryParams) {
      queryParams = {};
    }
    return oThis._send('POST', queryParams);
  }

  /**
   * Get parsed URL
   *
   * @param {string} resource - API Resource
   *
   * @return {object} - parsed url object
   *
   * @private
   */
  _parseURL(resource) {
    const oThis = this;

    return url.parse(resource);
  }

  /**
   * Send request
   *
   * @param {string} requestType - API request type
   * @param {object} queryParams - resource query parameters
   *
   * @private
   */
  async _send(requestType, queryParams) {
    const oThis = this,
      parsedURL = oThis._parseURL(oThis.resource),
      requestData = oThis.formatQueryParams(queryParams);

    const options = {
      host: parsedURL.hostname,
      port: parsedURL.port,
      path: parsedURL.path,
      method: requestType
    };

    if (requestType === 'GET') {
      options.path = options.path + '?' + requestData;
    }

    if (oThis.header) {
      options.headers = oThis.header;
    } else {
      options.headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };
    }

    logger.debug('Http Request Options: ', options);

    return new Promise(async function(onResolve, onReject) {
      let chunkedResponseData = '';

      let request = (parsedURL.protocol === 'https:' ? https : http).request(options, function(response) {
        response.setEncoding('utf8');

        response.on('data', function(chunk) {
          chunkedResponseData += chunk;
        });

        response.on('end', function() {
          onResolve(
            responseHelper.successWithData({
              responseData: chunkedResponseData,
              response: {
                status: response.statusCode
              }
            })
          );
        });
      });

      request.on('error', function(e) {
        onReject(
          responseHelper.error({
            internal_error_identifier: 'l_hr_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: { error: e }
          })
        );
      });

      // Write data to server
      if (requestType === 'POST') {
        request.write(requestData);
      }

      request.end();
    });
  }

  /**
   * Format query params.
   *
   * @param {object} queryParams - query params
   * @private
   */
  formatQueryParams(queryParams) {
    const oThis = this;

    if (oThis.noFormattingRequired) {
      return queryParams;
    }

    return queryString
      .stringify(queryParams, {
        arrayFormat: 'brackets',
        sort: function(a, b) {
          return a.localeCompare(b);
        }
      })
      .replace(/%20/g, '+');
  }
}

module.exports = HttpRequest;
