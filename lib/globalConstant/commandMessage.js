'use strict';
/**
 * Class for command message constants.
 *
 * @module lib/globalConstant/commandMessage
 */

/**
 * Class for command message constants.
 *
 * @class
 */
class commandMessageConstants {
  /**
   * Constructor for command message constants.
   *
   * @constructor
   */
  constructor() {}

  get markBlockingToOriginalStatus() {
    return 'markBlockingToOriginalStatus';
  }

  get goOnHold() {
    return 'goOnHold';
  }

  get goToOriginal() {
    return 'goToOriginal';
  }
}

module.exports = new commandMessageConstants();
