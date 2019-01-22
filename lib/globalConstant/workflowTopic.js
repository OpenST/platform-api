'use strict';
/**
 * Class for workflow topics being used in RabbitMQ.
 *
 * @module lib/globalConstant/workflowTopic
 */

/**
 * Class for workflow topics being used in RabbitMQ.
 *
 * @class
 */
class WorkflowTopicConstant {
  /**
   * Constructor for workflow topics being used in RabbitMQ.
   *
   * @constructor
   */
  constructor() {}

  get test() {
    return 'workflow.test';
  }

  get economySetup() {
    return 'workflow.economySetup';
  }

  get stateRootSync() {
    return 'workflow.stateRootSync';
  }

  get stPrimeStakeAndMint() {
    return 'workflow.stPrimeStakeAndMint';
  }

  get btStakeAndMint() {
    return 'workflow.btStakeAndMint';
  }
}

module.exports = new WorkflowTopicConstant();
