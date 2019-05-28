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
   * Get instance of rabbitmq provider.
   *
   * @param {string} rabbitmqKind: rabbitmq kind
   * @param {object} options
   * @param {number} options.auxChainId
   * @param {number} options.connectionWaitSeconds
   * @param {number} options.switchConnectionWaitSeconds
   *
   * @return {Promise<*>}
   */
  async getInstance(rabbitmqKind, options) {
    const auxChainId = options.auxChainId,
      connectionWaitSeconds = options.connectionWaitSeconds,
      switchConnectionWaitSeconds = options.switchConnectionWaitSeconds;

    let chainCompleteConfig, rabbitmqConfig;

    switch (rabbitmqKind) {
      case rabbitmqConstant.originRabbitmqKind: {
        chainCompleteConfig = await chainConfigProvider.getFor([0]);
        rabbitmqConfig = chainCompleteConfig['0'].originRabbitmq;
        break;
      }
      case rabbitmqConstant.globalRabbitmqKind: {
        chainCompleteConfig = await chainConfigProvider.getFor([0]);
        rabbitmqConfig = chainCompleteConfig['0'].globalRabbitmq;
        break;
      }
      case rabbitmqConstant.auxWebhooksPreprocessorRabbitmqKind: {
        chainCompleteConfig = await chainConfigProvider.getFor([auxChainId]);
        rabbitmqConfig = chainCompleteConfig[auxChainId].webhooksPreProcessorRabbitmq;
        break;
      }
      case rabbitmqConstant.auxWebhooksProcessorRabbitmqKind: {
        chainCompleteConfig = await chainConfigProvider.getFor([auxChainId]);
        rabbitmqConfig = chainCompleteConfig[auxChainId].webhooksProcessorRabbitmq;
        break;
      }
      default: {
        chainCompleteConfig = await chainConfigProvider.getFor([auxChainId]);
        rabbitmqConfig = chainCompleteConfig[auxChainId].rabbitmq;
      }
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
