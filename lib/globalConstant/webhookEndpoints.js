/**
 * Module for webhook endpoint constants.
 *
 * @module lib/globalConstant/webhookEndpoints
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  kms = require(rootPrefix + '/lib/globalConstant/kms');

// Declare variables.
let _statusConfig, _invertedStatusConfig, _apiVersionConfig, _invertedApiVersionConfig;

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

  get apiVersions() {
    if (_apiVersionConfig) {
      return _apiVersionConfig;
    }

    _apiVersionConfig = {
      '2': apiVersions.v2
    };

    return _apiVersionConfig;
  }

  get invertedApiVersions() {
    const oThis = this;

    if (_invertedApiVersionConfig) {
      return _invertedApiVersionConfig;
    }

    _invertedApiVersionConfig = util.invert(oThis.apiVersions);

    return _invertedApiVersionConfig;
  }

  get encryptionPurpose() {
    return kms.clientValidationPurpose;
  }

  get maxEndpointsPerClient() {
    return 10;
  }
}

module.exports = new WebhookEndpointsConstants();
