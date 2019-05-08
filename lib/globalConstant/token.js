'use strict';
/**
 * Token constants
 *
 * @module lib/globalConstant/token
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let _propertiesConfig, _invertedPropertiesConfig;

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

  // Token deployment status starts.

  get notDeployed() {
    return 'notDeployed';
  }

  get deploymentStarted() {
    return 'deploymentStarted';
  }

  get deploymentCompleted() {
    return 'deploymentCompleted';
  }

  get deploymentFailed() {
    return 'deploymentFailed';
  }

  get statuses() {
    const oThis = this;
    return {
      '1': oThis.notDeployed,
      '2': oThis.deploymentStarted,
      '3': oThis.deploymentCompleted,
      '4': oThis.deploymentFailed
    };
  }

  get invertedStatuses() {
    const oThis = this;

    return util.invert(oThis.statuses);
  }

  // Token deployment status ends.

  // Properties config Start

  get hasOstManagedOwnerProperty() {
    return 'hasOstManagedOwner';
  }

  get propertiesConfig() {
    const oThis = this;
    if (_propertiesConfig) {
      return _propertiesConfig;
    }
    _propertiesConfig = {
      [oThis.hasOstManagedOwnerProperty]: 1
    };
    return _propertiesConfig;
  }

  get invertedPropertiesConfig() {
    const oThis = this;
    if (_invertedPropertiesConfig) {
      return _invertedPropertiesConfig;
    }
    _invertedPropertiesConfig = util.invert(oThis.propertiesConfig);
    return _invertedPropertiesConfig;
  }

  // Properties config End
}

module.exports = new TokenConstants();
