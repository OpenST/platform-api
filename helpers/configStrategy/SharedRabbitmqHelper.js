'use strict';
/**
 * Shared RabbitMQ config strategy provider.
 *
 * @module helpers/configStrategy/rabbitmqEndpoints
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/configStrategy'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class for shared rabbitmq endpoints
 *
 * @class
 */
class SharedRabbitmqHelper {
  /**
   * Constructor for shared rabbitmq endpoints
   *
   * @constructor
   */
  constructor() {}

  /**
   * Fetches config strategy for shared rabbitmq.
   *
   * @returns {Promise<any>}
   */
  async get() {
    let strategyIdResponse = await new ConfigStrategyModel()
      .select(['id'])
      .where(['kind = ?', configStrategyConstants.invertedKinds[configStrategyConstants.sharedRabbitmq]])
      .fire();

    if (!strategyIdResponse) {
      logger.error('Error in fetching strategy id of shared rabbitmq provider');
    }

    let sharedRabbitmqStrategyId = strategyIdResponse[0].id,
      sharedRabbitmqData = await new ConfigStrategyModel().getByIds([sharedRabbitmqStrategyId]);

    if (!sharedRabbitmqData) {
      logger.error('Error in fetching shared rabbitmq provider data');
    }

    let finalFlatHash = sharedRabbitmqData[sharedRabbitmqStrategyId][configStrategyConstants.sharedRabbitmq];

    return Promise.resolve(finalFlatHash);
  }
}

module.exports = SharedRabbitmqHelper;
