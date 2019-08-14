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
  AuxPriceOracleCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/AuxPriceOracle'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
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

    console.log('chainAddressesRsp =========', chainAddressesRsp);
    console.log(
      'chainAddressesRsp.data[chainAddressConstants.auxOstToUsdPriceOracleContractKind] =========',
      chainAddressesRsp.data[chainAddressConstants.auxOstToUsdPriceOracleContractKind]
    );
    console.log(
      'chainAddressesRsp.data[chainAddressConstants.auxUsdcToUsdPriceOracleContractKind] =========',
      chainAddressesRsp.data[chainAddressConstants.auxUsdcToUsdPriceOracleContractKind]
    );

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

    // Fetch quote currency data
    let quoteCurrencyBySymbolCache = new QuoteCurrencyBySymbolCache({
      quoteCurrencySymbols: [quoteCurrencyConstants.USD]
    });

    let quoteCurrencyCacheRsp = await quoteCurrencyBySymbolCache.fetch();

    if (quoteCurrencyCacheRsp.isFailure() || !quoteCurrencyCacheRsp.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_o_mqq_papp_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let quoteCurrencyData = quoteCurrencyCacheRsp.data;

    // Fetch stake currency data
    let stakeCurrencyBySymbolCache = new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [stakeCurrencyConstants.OST, stakeCurrencyConstants.USDC]
    });

    let cacheResponse = await stakeCurrencyBySymbolCache.fetch();

    if (cacheResponse.isFailure() || !cacheResponse.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_o_mqq_papp_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    // Insert price oracle
    await new AuxPriceOracleModel({}).insertPriceOracle({
      chainId: auxChainId,
      stakeCurrencyId: cacheResponse.data[stakeCurrencyConstants.OST].id,
      quoteCurrencyId: quoteCurrencyData[quoteCurrencyConstants.USD].id,
      contractAddress: oThis.ostToUsdPriceOracleContractAddress,
      status: auxPriceOracleConstants.activeStatus
    });

    // clear cache
    new AuxPriceOracleCache({
      auxChainId: auxChainId,
      stakeCurrencyId: cacheResponse.data[stakeCurrencyConstants.OST].id,
      quoteCurrencyId: quoteCurrencyData[quoteCurrencyConstants.USD].id
    }).clear();

    // Insert price oracle
    await new AuxPriceOracleModel({}).insertPriceOracle({
      chainId: auxChainId,
      stakeCurrencyId: cacheResponse.data[stakeCurrencyConstants.USDC].id,
      quoteCurrencyId: quoteCurrencyData[quoteCurrencyConstants.USD].id,
      contractAddress: oThis.usdcToUsdPriceOracleContractAddress,
      status: auxPriceOracleConstants.activeStatus
    });

    // clear cache
    new AuxPriceOracleCache({
      auxChainId: auxChainId,
      stakeCurrencyId: cacheResponse.data[stakeCurrencyConstants.USDC].id,
      quoteCurrencyId: quoteCurrencyData[quoteCurrencyConstants.USD].id
    }).clear();
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
