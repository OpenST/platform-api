'use strict';
/**
 * Token constants
 *
 * @module lib/globalConstant/token
 */

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

  // Token deployment status ends.
}

module.exports = new TokenConstants();
