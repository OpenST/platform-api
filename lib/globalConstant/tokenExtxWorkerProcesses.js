/**
 * Module for token extx worker process constants.
 *
 * @module lib/globalConstant/tokenExtxWorkerProcesses
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let propertiesHash, invertedPropertiesHash;

/**
 * Class for token address constants
 *
 * @class TokenExtxWorkerProcessesConstants
 */
class TokenExtxWorkerProcessesConstants {
  get properties() {
    const oThis = this;

    if (!propertiesHash) {
      propertiesHash = {
        '1': oThis.activeProperty,
        '2': oThis.inactiveProperty,
        '4': oThis.onHoldProperty,
        '8': oThis.blockingProperty
      };
    }

    return propertiesHash;
  }

  get invertedProperties() {
    const oThis = this;

    if (!invertedPropertiesHash) {
      invertedPropertiesHash = util.invert(oThis.properties);
    }

    return invertedPropertiesHash;
  }

  get activeProperty() {
    return 'activeProperty';
  }

  get inactiveProperty() {
    return 'inactiveProperty';
  }

  get onHoldProperty() {
    return 'onHoldProperty';
  }

  get blockingProperty() {
    return 'blockingProperty';
  }
}

module.exports = new TokenExtxWorkerProcessesConstants();
