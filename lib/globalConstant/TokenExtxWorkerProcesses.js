'use strict';
/**
 * Token address constants
 *
 * @module lib/globalConstant/tokenAddress
 */

/**
 * Class for token address constants
 *
 * @class
 */

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util');

let propertiesHash, invertedPropertiesHash;

class TokenExtxWorkerProcessesConstants {
  constructor() {}

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
