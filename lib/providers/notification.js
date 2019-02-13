'use strict';
/**
 * RabbitMQ instance provider which is not client specific.
 *
 * @module lib/providers/notification
 */
const OpenStNotification = require('@openstfoundation/openst-notification');

const rootPrefix = '../..',
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class for shared rabbitmq provider
 *
 * @class
 */
class RabbitMqProviderKlass {
  /**
   * Constructor for shared rabbitmq provider
   *
   * @constructor
   */
  constructor() {}

  /**
   * Get shared rabbitmq provider
   *
   * @return {Object}
   */
  async getInstance(params) {
    const groupId = params.groupId || 0,
      chainId = params.chainId || 0;

    let rabbitKind = chainId ? configStrategyConstants.rabbitmq : configStrategyConstants.globalRabbitmq;

    // Fetch configStrategy for globalRabbitmq.
    const strategyByChainHelperObj = new StrategyByChainHelper(chainId, groupId),
      configStrategyResp = await strategyByChainHelperObj.getForKind(rabbitKind),
      notificationConfigStrategy = configStrategyResp.data[rabbitKind];

    if (params) {
      Object.assign(notificationConfigStrategy, {
        connectionTimeoutSec: params.connectionWaitSeconds,
        switchHostAfterSec: params.switchConnectionWaitSeconds
      });
    }
    notificationConfigStrategy['enableRabbitmq'] = '1'; // Required by notification subscriber.

    const finalStrategy = {
      rabbitmq: notificationConfigStrategy
    };

    return OpenStNotification.getInstance(finalStrategy);
  }
}

module.exports = new RabbitMqProviderKlass();
