'use strict';

const Memcached = require('memcached');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

Object.assign(Memcached.config, { retries: 1, timeout: 500, reconnect: 1000, poolSize: 200 });

/**
 * constructor
 *
 * @constructor
 */
class FlushSharedMemcached {
  async clearCache(key) {
    const oThis = this;

    try {
      // error handling
      if (oThis.validateCacheKey(key) === false) {
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 'l_cm_aic_clearCache_1',
            api_error_identifier: 'cache_key_invalid',
            error_config: errorConfig
          })
        );
      }

      const endPointsResponse = await oThis._getEndPoints();
      if (endPointsResponse.isFailure()) {
        return Promise.resolve(endPointsResponse);
      }

      const successEndpoint = [],
        failedEndpoint = [];

      for (let index in endPointsResponse.data.endPoints) {
        const endPoint = endPointsResponse.data.endPoints[index];
        const clearResponse = await oThis._clear(endPoint.trim(), key);
        if (clearResponse.isSuccess()) {
          successEndpoint.push(endPoint);
        } else {
          failedEndpoint.push(endPoint);
        }
      }

      return Promise.resolve(
        responseHelper.successWithData({ successEndpoint: successEndpoint, failedEndpoint: failedEndpoint })
      );
    } catch (err) {
      //Format the error
      logger.error('lib/sharedCacheManagement/FlushSharedMemcached.js:clearCache:wait inside catch ', err);
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_cm_aic_clearCache_2',
          api_error_identifier: 'unhandled_catch_response',
          error_config: errorConfig
        })
      );
    }
  }

  /**
   * Get end points of memcached servers
   *
   * @return {promise<result>}
   */
  _getEndPoints() {
    if (!coreConstants.SHARED_MEMCACHE_SERVERS) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_cm_aic_getEndPoints_1',
          api_error_identifier: 'cache_servers_unavailable',
          error_config: errorConfig
        })
      );
    }
    const endPoints = coreConstants.SHARED_MEMCACHE_SERVERS.split(',');

    return Promise.resolve(responseHelper.successWithData({ endPoints: endPoints }));
  }

  /**
   * Clear data from given endpoint server
   *
   * @param {string} endPoint - Memcache server endpoint
   * @param {string} key - key whose cache needs to be cleared
   *
   * @return {promise<result>}
   */
  _clear(endPoint, key) {
    const oThis = this;

    return new Promise(function(onResolve, onReject) {
      try {
        const client = new Memcached(endPoint);

        // Error handling
        client.on('issue', function(details) {
          logger.error('Issue with Memcache server. Trying to resolve!');
        });
        client.on('failure', function(details) {
          logger.error('Server ' + details.server + 'went down due to: ' + details.messages.join(''));
        });
        client.on('reconnecting', function(details) {
          logger.error('Total downtime caused by server ' + details.server + ' :' + details.totalDownTime + 'ms');
        });

        // Set callback method
        let callback = function(err, data) {
          if (err) {
            onResolve(
              responseHelper.error({
                internal_error_identifier: 'l_cm_aic_clear_2',
                api_error_identifier: 'cache_issue',
                debug_options: { err: err },
                error_config: errorConfig
              })
            );
          } else {
            onResolve(responseHelper.successWithData({ response: true }));
          }
        };

        // Perform action
        client.del(key, callback);
      } catch (err) {
        //Format the error
        logger.error('lib/sharedCacheManagement/FlushSharedMemcached.js:_clear:wait inside catch ', err);
        return onResolve(
          responseHelper.error({
            internal_error_identifier: 'l_cm_aic_clear_3',
            api_error_identifier: 'cache_issue',
            debug_options: { err: err },
            error_config: errorConfig
          })
        );
      }
    });
  }

  /**
   * Validation of cache key
   *
   * @param {string} key - key whose cache needs to be cleared
   *
   * @return {bool}
   */
  validateCacheKey(key) {
    const oThis = this;

    if (typeof key !== 'string') {
      logger.error('cache key not a string', key);
      return false;
    }

    if (key === '' || key === undefined || key === null) {
      logger.error('cache key should not be blank', key);
      return false;
    }

    if (oThis._validateCacheValueSize(key, 250) !== true) {
      logger.error('cache key byte size should not be > 250', key, ' size ', oThis._validateCacheValueSize(key, 250));
      return false;
    }

    if (oThis._validateCacheKeyChars(key) !== true) {
      logger.error('cache key has unsupported chars', key);
      return false;
    }

    return true;
  }

  // check if cache value size is < size
  _validateCacheValueSize(value, size) {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') <= size ? true : false;
  }

  // check key has valid chars
  _validateCacheKeyChars(key) {
    return /\s/.test(key) ? false : true;
  }
}

module.exports = FlushSharedMemcached;
