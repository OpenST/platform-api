/**
 * Module for webhook endpoint constants.
 *
 * @module lib/globalConstant/webhookEndpoint
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  kms = require(rootPrefix + '/lib/globalConstant/kms');

// Declare variables.
let _statusConfig, _invertedStatusConfig;

/**
 * Class for webhook endpoint constants.
 *
 * @class WebhookEndpointConstants
 */
class WebhookEndpointConstants {
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

  get encryptionPurpose() {
    return kms.clientValidationPurpose;
  }
}

module.exports = new WebhookEndpointConstants();
