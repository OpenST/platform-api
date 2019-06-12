'use strict';
/**
 * Module to populate aux price oracles
 *
 * @module executables/oneTimers/multipleQuoteCurrencies/populateAuxPriceOracles
 */

const rootPrefix = '../../..',
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  AuxPriceOracleModel = require(rootPrefix + '/app/models/mysql/AuxPriceOracle'),
  QuoteCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/QuoteCurrencyBySymbol'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  auxPriceOracleConstants = require(rootPrefix + '/lib/globalConstant/auxPriceOracle');

const auxChainId = process.argv[2];

class PopulateAuxPriceOracles {
  constructor() {}

  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchPriceOraclesFromChainAddresses();

    await oThis._populateAuxPriceOracles();
  }

  /**
   * Fetch price oracle addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchPriceOraclesFromChainAddresses() {
    const oThis = this;

    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.ostToUsdPriceOracleContractAddress =
      chainAddressesRsp.data[chainAddressConstants.auxOstToUsdPriceOracleContractKind].address;
    oThis.usdcToUsdPriceOracleContractAddress =
      chainAddressesRsp.data[chainAddressConstants.auxUsdcToUsdPriceOracleContractKind].address;
  }

  /**
   * Populate aux price oracles
   *
   * @return {Promise<void>}
   * @private
   */
  async _populateAuxPriceOracles() {
    const oThis = this;

    let quoteCurrencyBySymbolCache = new QuoteCurrencyBySymbolCache({
      quoteCurrencySymbols: ['USD']
    });

    let quoteCurrencyCacheRsp = await quoteCurrencyBySymbolCache.fetch();

    let quoteCurrencyData = quoteCurrencyCacheRsp.data;

    let stakeCurrencyBySymbolCache = new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [stakeCurrencyConstants.OST, stakeCurrencyConstants.USDC]
    });

    let cacheResponse = await stakeCurrencyBySymbolCache.fetch();

    // TODO - Santhosh - handle failure

    let auxPriceOracleModel = new AuxPriceOracleModel({});

    await auxPriceOracleModel.insertPriceOracle({
      chainId: auxChainId,
      stakeCurrencyId: cacheResponse.data[stakeCurrencyConstants.OST].id,
      // TODO - Santhosh - remove hardcoding
      quoteCurrencyId: quoteCurrencyData['USD'].id,
      contractAddress: oThis.ostToUsdPriceOracleContractAddress,
      status: auxPriceOracleConstants.activeStatus
    });

    // TODO - Santhosh - clear cache here

    auxPriceOracleModel = new AuxPriceOracleModel({});

    await auxPriceOracleModel.insertPriceOracle({
      chainId: auxChainId,
      stakeCurrencyId: cacheResponse.data[stakeCurrencyConstants.USDC].id,
      // TODO - Santhosh - remove hardcoding
      quoteCurrencyId: quoteCurrencyData['USD'].id,
      contractAddress: oThis.usdcToUsdPriceOracleContractAddress,
      status: auxPriceOracleConstants.activeStatus
    });
  }
}

let populateAuxPriceOracles = new PopulateAuxPriceOracles();

populateAuxPriceOracles
  .perform()
  .then(function(resp) {
    console.log(resp);
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
