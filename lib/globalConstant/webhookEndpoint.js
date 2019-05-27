'use strict';
/**
 * webhookEndpoint constants
 *
 * @module lib/globalConstant/webhookEndpoint
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let _statusConfig, _invertedStatusConfig;

/**
 * Class for token constants
 *
 * @class
 */
class TokenConstants {
  /**
   * Constructor for token constants
   *
   * @constructor
   */
  constructor() {}

  // webhook endpoints status starts.

  get active() {
    return 'active';
  }

  get inactive() {
    return 'inactive';
  }

  get statuses() {
    const oThis = this;
    if (_statusConfig) {
      return _statusConfig;
    }

    _statusConfig = {
      '1': oThis.active,
      '2': oThis.inactive
    };
    return _statusConfig;
  }

  get invertedStatuses() {
    const oThis = this;
    if (_invertedStatusConfig) {
      return _invertedStatusConfig;
    }
    _invertedStatusConfig = util.invert(oThis.statuses);
    return _invertedStatusConfig;
  }

  // webhook endpoints status ends.
}

module.exports = new TokenConstants();
