'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class RabbitSubscription {
  /**
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.rabbitmqKind = params.rabbitmqKind;
    oThis.topic = params.topic;
    oThis.queue = params.queue;
    oThis.prefetchCount = params.prefetchCount;
    oThis.auxChainId = params.auxChainId; // needed only in case of rabbitmqKind == auxRabbitmq

    oThis.promiseQueueManager = null;
    oThis.consumerTag = null;
    oThis.subscribed = 0;
  }

  /**
   * Mark as subscribed
   */
  markAsSubscribed() {
    const oThis = this;

    oThis.subscribed = 1;
  }

  /**
   *
   * @return {boolean}
   */
  isSubscribed() {
    const oThis = this;

    return oThis.subscribed == 1;
  }

  /**
   * Stop consumption
   */
  stopConsumption() {
    const oThis = this;

    oThis.subscribed = 0;

    if (oThis.consumerTag) {
      logger.info(':: :: Cancelling consumption on tag', oThis.consumerTag);
      process.emit('CANCEL_CONSUME', oThis.consumerTag);
    }
  }

  /**
   * Resume consumption
   */
  resumeConsumption() {
    const oThis = this;

    process.emit('RESUME_CONSUME', oThis.consumerTag);
  }

  /**
   * Set promise queue manager
   *
   * @param p
   */
  setPromiseQueueManager(p) {
    const oThis = this;

    oThis.promiseQueueManager = p;
  }

  /**
   * Set consumer tag
   * @param c
   */
  setConsumerTag(c) {
    const oThis = this;

    oThis.consumerTag = c;
  }
}

module.exports = RabbitSubscription;
