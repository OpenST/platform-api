/**
 * Module for RabbitMQ instance provider.
 *
 * @module lib/providers/rabbitmq
 */

const OSTNotification = require('@ostdotcom/notification');

const rootPrefix = '../..',
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

/**
 * Class for RabbitMQ instance provider.
 *
 * @class RabbitmqProvider
 */
class RabbitmqProvider {
  /**
   * Get instance
   *
   * @param {string} rabbitmqKind: rabbitmq kind
   * @param {object} options
   *
   * @return {Promise<*>}
   */
  async getInstance(rabbitmqKind, options) {
    const auxChainId = options.auxChainId,
      connectionWaitSeconds = options.connectionWaitSeconds,
      switchConnectionWaitSeconds = options.switchConnectionWaitSeconds;

    let chainCompleteConfig, rabbitmqConfig;

    if (rabbitmqKind === rabbitmqConstant.originRabbitmqKind) {
      chainCompleteConfig = await chainConfigProvider.getFor([0]);
      rabbitmqConfig = chainCompleteConfig['0'].originRabbitmq;
    } else if (rabbitmqKind === rabbitmqConstant.globalRabbitmqKind) {
      chainCompleteConfig = await chainConfigProvider.getFor([0]);
      rabbitmqConfig = chainCompleteConfig['0'].globalRabbitmq;
    } else if (rabbitmqKind === rabbitmqConstant.auxWebhooksPreprocessorRabbitmqKind) {
      chainCompleteConfig = await chainConfigProvider.getFor([auxChainId]);
      rabbitmqConfig = chainCompleteConfig[auxChainId].webhooksPreProcessorRabbitmq;
    } else if (rabbitmqKind === rabbitmqConstant.auxWebhooksProcessorRabbitmqKind) {
      chainCompleteConfig = await chainConfigProvider.getFor([auxChainId]);
      rabbitmqConfig = chainCompleteConfig[auxChainId].webhooksProcessorRabbitmq;
    } else {
      chainCompleteConfig = await chainConfigProvider.getFor([auxChainId]);
      rabbitmqConfig = chainCompleteConfig[auxChainId].rabbitmq;
    }

    Object.assign(rabbitmqConfig, {
      connectionTimeoutSec: connectionWaitSeconds,
      switchHostAfterSec: switchConnectionWaitSeconds,
      enableRabbitmq: '1'
    });

    return OSTNotification.getInstance({
      rabbitmq: rabbitmqConfig
    });
  }
}

module.exports = new RabbitmqProvider();
