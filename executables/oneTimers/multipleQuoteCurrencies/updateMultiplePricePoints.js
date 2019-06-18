'use strict';

/**
 * update price points for multiple quote currencies
 *
 * @module executables/oneTimers/multipleQuoteCurrencies/updateMultiplePricePoints
 *
 * Usage - node executables/oneTimers/multipleQuoteCurrencies/updateMultiplePricePoints.js 2000 OST USD
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/updatePricePoints/FetchPricePointFromCoinMarketCapApi');
require(rootPrefix + '/lib/updatePricePoints/SetPriceInPriceOracleContract');
require(rootPrefix + '/lib/updatePricePoints/VerifySetPriceInPriceOracleContract');

let chainId = process.argv[2],
  baseCurrency = process.argv[3],
  quoteCurrency = process.argv[4];

class UpdatePricePoints {
  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchAndSetConfig();

    await oThis._fetchPricePoints();

    await oThis._setPricePoint();

    await oThis._verifyAndActivatePricePoint();
  }

  /**
   * Fetch and set config
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchAndSetConfig() {
    const oThis = this;

    let strategyByChainId = new StrategyByChainHelper(chainId);
    let configRsp = await strategyByChainId.getComplete();

    let config = configRsp.data;

    oThis.ic = new InstanceComposer(config);
  }

  /**
   * Fetch price points
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchPricePoints() {
    const oThis = this;

    const FetchPricePointFromCoinMarketCapApi = oThis.ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'FetchPricePointFromCoinMarketCapApi'
      ),
      fetchPricePointFromCoinMarketCapApiObj = new FetchPricePointFromCoinMarketCapApi({
        quoteCurrency: quoteCurrency,
        baseCurrency: baseCurrency
      });

    let pricePoint = await fetchPricePointFromCoinMarketCapApiObj.perform();

    oThis.pricePointData = pricePoint.data;
  }

  /**
   * Set price point
   *
   * @return {Promise<void>}
   * @private
   */
  async _setPricePoint() {
    const oThis = this;

    const SetPriceInPriceOracleContractKlass = oThis.ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'SetPriceInPriceOracleContract'
      ),
      setPriceInPriceOracleContractObj = new SetPriceInPriceOracleContractKlass({
        auxChainId: chainId,
        currentErc20Value: oThis.pricePointData.taskResponseData.currentErc20Value,
        baseCurrency: baseCurrency,
        waitTillReceipt: 1
      });

    let setPricePointRsp = await setPriceInPriceOracleContractObj.perform();

    oThis.setPricePointData = setPricePointRsp.data;
  }

  /**
   * Verify and activate price point
   *
   * @return {Promise<*>}
   * @private
   */
  async _verifyAndActivatePricePoint() {
    const oThis = this;

    const VerifySetPriceInPriceOracleContract = oThis.ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'VerifySetPriceInPriceOracleContract'
      ),
      verifySetPriceInPriceOracleContract = new VerifySetPriceInPriceOracleContract({
        auxChainId: chainId,
        currencyConversionTableId: oThis.setPricePointData.taskResponseData.currencyConversionTableId,
        currentErc20Value: oThis.pricePointData.taskResponseData.currentErc20Value,
        transactionHash: oThis.setPricePointData.taskResponseData.transactionHash,
        priceOracleContractAddress: oThis.setPricePointData.taskResponseData.priceOracleContractAddress,
        dontCheckTxStatus: true
      });

    return verifySetPriceInPriceOracleContract.perform();
  }
}

new UpdatePricePoints()
  .perform()
  .then(function(rsp) {
    console.log(rsp);
    process.exit(0);
  })
  .catch(function(err) {
    console.log(err);
    process.exit(1);
  });

module.exports = UpdatePricePoints;
