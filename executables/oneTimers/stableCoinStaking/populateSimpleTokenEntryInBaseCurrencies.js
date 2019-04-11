/**
 * Module to populate simple token entry in base currencies table.
 *
 * @module executables/oneTimers/stableCoinStaking/populateSimpleTokenEntryInBaseCurrencies
 */

const rootPrefix = '../../..',
  UpdateBaseCurrenciesTable = require(rootPrefix + '/lib/UpdateBaseCurrenciesTable'),
  ConfigStrategyByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to populate simple token entry in base currencies table.
 *
 * @class PopulateSimpleTokenEntryInBaseCurrency
 */
class PopulateSimpleTokenEntryInBaseCurrency {
  /**
   * Main performer for class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.getWeb3Provider();

    await oThis.fetchStContractAddress();

    await oThis.createEntryInBaseCurrenciesTable();
  }

  /**
   * Fetch origin chain config strategy.
   *
   * @return {Promise<void>}
   */
  async getWeb3Provider() {
    const oThis = this;

    const csHelper = new ConfigStrategyByChainId(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      provider = readWriteConfig.wsProvider ? readWriteConfig.wsProvider : readWriteConfig.rpcProvider;

    oThis.web3Instance = web3Provider.getInstance(provider).web3WsProvider;
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
   * Create OST entry in base currency table.
   *
   * @return {Promise<void>}
   */
  async createEntryInBaseCurrenciesTable() {
    const oThis = this;

    await new UpdateBaseCurrenciesTable(oThis.stContractAddress).perform();
  }
}

new PopulateSimpleTokenEntryInBaseCurrency()
  .perform()
  .then(() => {
    console.log('One timer finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.log(`Error: ${err}`);
    process.exit(1);
  });
