'use strict';
/**
 * RabbitMQ instance provider which is not client specific.
 *
 * @module lib/providers/sharedNotification
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
class SharedRabbitMqProviderKlass {
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
    const groupId = 0,
      chainId = 0;

    // Fetch configStrategy for globalRabbitmq.
    const strategyByChainHelperObj = new StrategyByChainHelper(chainId, groupId),
      configStrategyResp = await strategyByChainHelperObj.getForKind(configStrategyConstants.globalRabbitmq),
      notificationConfigStrategy = configStrategyResp.data[configStrategyConstants.globalRabbitmq];

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

module.exports = new SharedRabbitMqProviderKlass();
