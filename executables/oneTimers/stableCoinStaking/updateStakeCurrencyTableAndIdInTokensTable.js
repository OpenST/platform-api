/**
 * Module to update stake currency table with OST contract address and update stake currency table id for all tokens.
 *
 * @module executables/oneTimers/stableCoinStaking/updateStakeCurrencyTableAndIdInTokensTable
 */

const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  UpdateStakeCurrenciesTable = require(rootPrefix + '/lib/stableCoin/UpdateStakeCurrenciesTable'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class to update stake currency table with OST contract address and update stake currency table id for all tokens.
 *
 * @class UpdateStakeCurrencyTableAndIdInTokensTable
 */
class UpdateStakeCurrencyTableAndIdInTokensTable {
  /**
   * Performer.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.fetchStContractAddress();

    await oThis.updateStContractAddressInStakeCurrencies();

    await oThis.updateStakeCurrencyIdInTokens();
  }

  /**
   * Fetch ST Contract address.
   *
   * @return {Promise<void>}
   */
  async fetchStContractAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.stContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;

    console.log(`Fetched OST contract address. Address: ${oThis.stContractAddress}`);
  }

  /**
   * Create OST entry in stake currencies table.
   *
   * @return {Promise<void>}
   */
  async updateStContractAddressInStakeCurrencies() {
    const oThis = this;

    oThis.insertId = await new UpdateStakeCurrenciesTable(oThis.stContractAddress).perform();
  }

  /**
   * Update stake currency id in tokens table.
   *
   * @return {Promise<void>}
   */
  async updateStakeCurrencyIdInTokens() {
    const oThis = this;

    await new TokenModel()
      .update({
        stake_currency_id: oThis.insertId
      })
      .fire();

    console.log('Stake currency Id successfully updated for all tokens.');
  }
}

new UpdateStakeCurrencyTableAndIdInTokensTable()
  .perform()
  .then(() => {
    console.log('One timer finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.log(`Error: ${err}`);
    process.exit(1);
  });
