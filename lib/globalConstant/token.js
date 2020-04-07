const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let _invertedStatuses, _invertedPropertiesConfig;

/**
 * Class for token constants.
 *
 * @class TokenConstants
 */
class TokenConstants {
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

    _invertedStatuses = _invertedStatuses || util.invert(oThis.statuses);

    return _invertedStatuses;
  }
  // Token deployment status ends.

  // Properties config Start
  get hasOstManagedOwnerProperty() {
    return 'hasOstManagedOwner';
  }

  get lowBalanceEmail() {
    return 'lowBalanceEmail';
  }

  get veryLowBalanceEmail() {
    return 'veryLowBalanceEmail';
  }

  get zeroBalanceEmail() {
    return 'zeroBalanceEmail';
  }

  get propertiesConfig() {
    const oThis = this;

    return {
      [oThis.hasOstManagedOwnerProperty]: 1,
      [oThis.lowBalanceEmail]: 2,
      [oThis.veryLowBalanceEmail]: 4,
      [oThis.zeroBalanceEmail]: 8
    };
  }

  get invertedPropertiesConfig() {
    const oThis = this;

    _invertedPropertiesConfig = _invertedPropertiesConfig || util.invert(oThis.propertiesConfig);

    return _invertedPropertiesConfig;
  }
  // Properties config end.
}

module.exports = new TokenConstants();
