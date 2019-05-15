/**
 * Module to delete pax entry permanently from mysql and dynamoDB.
 *
 * @module executables/oneTimers/stakeCurrencies2.1/deletePaxPermanently
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/shared/BaseCurrency');

/**
 * Class to delete pax entry permanently from mysql and dynamoDB.
 *
 * @class DeletePaxPermanently
 */
class DeletePaxPermanently {
  /**
   * Main performer of class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._deletePaxStakeCurrency();

    await oThis._deletePaxBaseCurrency();
  }

  /**
   * Fetch config strategy.
   *
   * @return {Promise<void>}
   */
  async getConfigStrategy() {
    const oThis = this;

    const strategyByChainHelper = new StrategyByChainHelper(0, 0),
      strategyFetchRsp = await strategyByChainHelper.getComplete();

    oThis.configStrategy = strategyFetchRsp.data;
  }

  /**
   * Delete PAX stake currency from MySQL.
   *
   * @sets oThis.paxContractAddress
   *
   * @returns {Promise<void>}
   * @private
   */
  async _deletePaxStakeCurrency() {
    const oThis = this;

    const paxContractDetails = await new StakeCurrencyModel()
      .select('*')
      .where({ symbol: 'PAX' })
      .fire();

    for (let index = 0; index < paxContractDetails.length; index++) {
      oThis.paxContractAddress = paxContractDetails[index].contract_address;
    }

    await new StakeCurrencyModel()
      .delete()
      .where({ symbol: 'PAX' })
      .fire();
  }

  /**
   * Delete PAX base currency from DynamoDb.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _deletePaxBaseCurrency() {
    const oThis = this;

    await oThis.getConfigStrategy();

    const ic = new InstanceComposer(oThis.configStrategy),
      BaseCurrencyModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BaseCurrency');
    const baseCurrencyObject = new BaseCurrencyModel({});

    const deleteParams = [{ contractAddress: oThis.paxContractAddress }];

    await baseCurrencyObject.batchDeleteItem(deleteParams);
  }
}

new DeletePaxPermanently()
  .perform()
  .then(() => {
    logger.win('One-timer finished.');
    process.exit(0);
  })
  .catch(() => {
    logger.error('One-timer failed.');
    process.exit(1);
  });
