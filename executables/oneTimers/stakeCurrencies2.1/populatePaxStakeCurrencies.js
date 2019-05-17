/**
 * Module to populate PAX stake currency related changes in stake currencies table.
 *
 * @module executables/oneTimers/stakeCurrencies2.1/populatePaxStakeCurrencies
 */

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo');

/**
 * Class to populate PAX stake currency related changes in stake currencies table.
 *
 * @class PopulatePaxStakeCurrencies
 */
class PopulatePaxStakeCurrencies {
  /**
   * Main performer of class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    if (coreConstants.environment === environmentInfoConstants.environment.production) {
      logger.error('This one-timer should not run in production.');
      process.exit(1);
    }

    await oThis._fetchChainAddresses();

    await oThis._updateStakeCurrencyTable();
  }

  /**
   * Fetch chain addresses.
   *
   * @sets oThis.ownerAddress
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchChainAddresses() {
    const oThis = this;

    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.ownerAddress = chainAddressesRsp.data[chainAddressConstants.usdcContractOwnerKind].address;
  }

  /**
   * Get contract constants for PAX.
   *
   * @returns {{companyTokenHolderSessionSpendingLimit: string, baseCurrencyCode: string, prefixToFetchPriceFromCoinMarketCap: string, grantAmountInWei: string}}
   * @private
   */
  get _contractConstants() {
    return {
      baseCurrencyCode: 'PAX',
      grantAmountInWei: '10000000000000000000000',
      prefixToFetchPriceFromCoinMarketCap: 'pax',
      companyTokenHolderSessionSpendingLimit: '10000000000000000000000'
    };
  }

  /**
   * Get contract addresses.
   *
   * @returns {{owner: string}}
   * @private
   */
  get _contractAddresses() {
    const oThis = this;

    return {
      owner: oThis.ownerAddress
    };
  }

  /**
   * Update stake currency table for OST.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateStakeCurrencyTable() {
    const oThis = this;

    await new StakeCurrencyModel()
      .update({
        constants: JSON.stringify(oThis._contractConstants),
        addresses: JSON.stringify(oThis._contractAddresses),
        status: stakeCurrencyConstants.invertedStatuses[stakeCurrencyConstants.inActiveStatus]
      })
      .where({
        symbol: 'PAX'
      })
      .fire();
  }
}

new PopulatePaxStakeCurrencies()
  .perform()
  .then(() => {
    logger.win('One-timer finished.');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('One-timer failed.', err);
    process.exit(1);
  });
