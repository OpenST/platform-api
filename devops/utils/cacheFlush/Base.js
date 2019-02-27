'use strict';
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');
/**
 * Cache flush
 *
 * @class
 */
class Base {
  /**
   * Constructor
   * @constructor
   */
  constructor() {
    const oThis = this;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('devops/utils/flush_memcache.js::perform::catch', error);
        return oThis._getRespError('do_u_fm_b_p1');
      }
    });
  }

  /**
   * Generate Error response
   *
   * @param code {String} - Error internal identifier
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getRespError(code, debugData) {
    const oThis = this;

    return responseHelper.error({
      internal_error_identifier: code,
      api_error_identifier: 'something_went_wrong',
      debug_options: debugData || {}
    });
  }
}

module.exports = Base;
