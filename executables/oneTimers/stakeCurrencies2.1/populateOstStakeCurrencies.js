/**
 * Module to populate OST stake currency related changes in stake currencies table.
 *
 * @module executables/oneTimers/stakeCurrencies2.1/populateOstStakeCurrencies
 */

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency');

/**
 * Class to populate OST stake currency related changes in stake currencies table.
 *
 * @class PopulateOstStakeCurrencies
 */
class PopulateOstStakeCurrencies {
  /**
   * Main performer of class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchChainAddresses();

    await oThis._updateStakeCurrencyTable();
  }

  /**
   * Fetch chain addresses.
   *
   * @sets oThis.simpleTokenOwnerAddress, oThis.simpleTokenAdminAddress
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchChainAddresses() {
    const oThis = this;

    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.simpleTokenOwnerAddress = chainAddressesRsp.data[chainAddressConstants.stContractOwnerKind].address;
    oThis.simpleTokenAdminAddress = chainAddressesRsp.data[chainAddressConstants.stContractAdminKind].address;
  }

  /**
   * Get contract constants for OST.
   *
   * @returns {{companyTokenHolderSessionSpendingLimit: string, baseCurrencyCode: string, prefixToFetchPriceFromCoinMarketCap: string, grantAmountInWei: string}}
   * @private
   */
  get _contractConstants() {
    return {
      baseCurrencyCode: 'OST',
      grantAmountInWei: '10000000000000000000000',
      prefixToFetchPriceFromCoinMarketCap: 'simple-token',
      companyTokenHolderSessionSpendingLimit: '10000000000000000000000'
    };
  }

  /**
   * Get contract addresses.
   *
   * @returns {{owner: string, admin: string}}
   * @private
   */
  get _contractAddresses() {
    const oThis = this;

    return {
      owner: oThis.simpleTokenOwnerAddress,
      admin: oThis.simpleTokenAdminAddress
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
        status: stakeCurrencyConstants.invertedStatuses[stakeCurrencyConstants.activeStatus]
      })
      .where({
        symbol: 'OST'
      })
      .fire();
  }
}

new PopulateOstStakeCurrencies()
  .perform()
  .then(() => {
    logger.win('One-timer finished.');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('One-timer failed.', err);
    process.exit(1);
  });
