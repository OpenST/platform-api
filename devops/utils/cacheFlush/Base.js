'use strict';
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger')
  ,responseHelper = require(rootPrefix + '/lib/formatter/response')

;
/**
 * Class for Generating addresses for Origin and Auxiliary chains
 *
 * @class
 */
class Base {

  /**
   * Constructor
   *
   * @param configFilePath
   *
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

    return oThis._asyncPerform().catch(function (error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('devops/utils/flush_memcache.js::perform::catch', error);
        return oThis._getRespError('do_u_fm_b_p1');
      }
    });
  }
}

module.exports = Base;