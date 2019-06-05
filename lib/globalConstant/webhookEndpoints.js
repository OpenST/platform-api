/**
 * Module for webhook endpoint constants.
 *
 * @module lib/globalConstant/webhookEndpoints
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  kms = require(rootPrefix + '/lib/globalConstant/kms');

// Declare variables.
let _statusConfig, _invertedStatusConfig;

/**
 * Class for webhook endpoint constants.
 *
 * @class WebhookEndpointsConstants
 */
class WebhookEndpointsConstants {
  get activeStatus() {
    return 'active';
  }

  get inActiveStatus() {
    return 'inactive';
  }

  get statuses() {
    const oThis = this;

    if (_statusConfig) {
      return _statusConfig;
    }

    _statusConfig = {
      '1': oThis.activeStatus,
      '2': oThis.inActiveStatus
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

  get maxEndpointsPerClient() {
    return 5;
  }
}

module.exports = new WebhookEndpointsConstants();
