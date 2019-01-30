'use strict';
/**
 * This is base class for all services.
 *
 * @module services/Base
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

/**
 * Base class for all services
 *
 * @class
 */
class ServicesBaseKlass {
  /**
   * Constructor for base class service
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.params = params;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;
    return oThis._asyncPerform().catch(function(err) {
      // If asyncPerform fails, run the below catch block.
      logger.error(' In catch block of services/Base.js', err);
      return responseHelper.error({
        internal_error_identifier: 's_b_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: errorConfig
      });
    });
  }

  /**
   * Async performer.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _asyncPerform() {
    throw 'sub-class to implement';
  }
}

module.exports = ServicesBaseKlass;
