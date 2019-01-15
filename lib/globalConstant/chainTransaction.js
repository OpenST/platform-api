'use strict';
/**
 * Chain transaction related constants
 *
 * @module lib/globalConstant/chainTransaction
 */
const rootPrefix = '../..';

/**
 * @class
 */
class ChainTransaction {
  /**
   * @constructor
   */
  constructor() {}

  get organizationExpirationHeight() {
    return 10000000;
  }
}

module.exports = new ChainTransaction();
