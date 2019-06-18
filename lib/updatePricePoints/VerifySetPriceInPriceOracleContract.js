/**
 * Module to verify set price in price oracle contract.
 *
 * @module lib/updatePricePoints/VerifySetPriceInPriceOracleContract
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  OpenSTOracle = require('@ostdotcom/ost-price-oracle'),
  PriceOracleHelper = OpenSTOracle.PriceOracleHelper;

const rootPrefix = '../..',
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  OstPricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

// Declare variables.
const maxRetryCountForVerifyPriceInContract = 100;

/**
 * Class to verify set price in price oracle contract.
 *
 * @class VerifySetPriceInPriceOracleContract
 */
class VerifySetPriceInPriceOracleContract {
  /**
   * Constructor to verify set price in price oracle contract.
   *
   * @param {object} params
   * @param {number/string} params.auxChainId: auxChainId
   * @param {number} params.currencyConversionTableId: currencyConversionTableId
   * @param {string} params.transactionHash: transactionHash
   * @param {object} params.currentErc20Value: currentErc20Value
   * @param {object} params.dontCheckTxStatus: true/false
   * @param {string} params.priceOracleContractAddress: priceOracleContractAddress
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.currencyConversionTableId = params.currencyConversionTableId;
    oThis.transactionHash = params.transactionHash;
    oThis.currentErc20Value = params.currentErc20Value;
    oThis.dontCheckTxStatus = params.dontCheckTxStatus || false;
    oThis.priceOracleContractAddress = params.priceOracleContractAddress;

    oThis.auxWeb3Instance = {};
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    if (!oThis.transactionHash) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed
      });
    }

    if (!oThis.dontCheckTxStatus) {
      await oThis._checkTxStatus();
    }

    await oThis._updateTxHashInTable();

    await oThis._setWeb3Instance();

    await oThis._compareContractPrice();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone
    });
  }

  /**
   * Check transaction status
   *
   * @return {Promise<never>}
   * @private
   */
  async _checkTxStatus() {
    const oThis = this;
    const txSuccessRsp = await new CheckTxStatus({
      chainId: oThis.auxChainId,
      transactionHash: oThis.transactionHash
    }).perform();

    if (txSuccessRsp.isFailure()) {
      return Promise.reject(txSuccessRsp);
    }
  }

  /**
   * Update transaction hash in currency conversion rates table.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _updateTxHashInTable() {
    const oThis = this;

    // Update transaction hash.
    const updateTransactionResponse = await new CurrencyConversionRateModel().updateTransactionHash(
      oThis.currencyConversionTableId,
      oThis.transactionHash
    );
    if (!updateTransactionResponse) {
      logger.error('Error while updating transaction hash in table.');

      return Promise.reject(new Error('Error while updating transaction hash in table.'));
    }

    return Promise.resolve(updateTransactionResponse);
  }

  /**
   * Set Web3 Instance.
   *
   * @sets oThis.auxWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    const chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');

    oThis.auxWeb3Instance = web3Provider.getInstance(chainEndpoint).web3WsProvider;
  }

  /**
   * Fetch contract price from contract and compare the price set with the contract price.
   *
   * @return {Promise<any>}
   * @private
   */
  _compareContractPrice() {
    const oThis = this;

    const chainId = oThis.auxChainId,
      dbRowId = oThis.currencyConversionTableId,
      conversionRate = oThis.currentErc20Value.conversionRate;

    let attemptCountForVerifyPriceInContract = 1;

    return new Promise(function(onResolve, onReject) {
      /**
       * Compare contract price in a loop.
       *
       * @return {Promise<*>}
       */
      const loopCompareContractPrice = async function() {
        if (attemptCountForVerifyPriceInContract > maxRetryCountForVerifyPriceInContract) {
          const errorObject = responseHelper.error({
            internal_error_identifier: 'price_point_not_set:l_upp_vsppoc_1',
            api_error_identifier: 'price_point_not_set',
            debug_options: { dbRowId: dbRowId }
          });

          await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

          return onReject(`dbRowId: ${dbRowId} maxRetryCountForVerifyPriceInContract reached`);
        }

        const priceInDecimal = await new PriceOracleHelper().decimalPrice(
          oThis.auxWeb3Instance,
          oThis.priceOracleContractAddress
        );

        if (priceInDecimal.isFailure()) {
          const errorObject = responseHelper.error({
            internal_error_identifier: 'invalid_contract_price_point:l_upp_vsppoc_2',
            api_error_identifier: 'invalid_contract_price_point',
            debug_options: { priceInDecimal: priceInDecimal }
          });

          await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

          return onResolve('error');
        } else if (priceInDecimal.isSuccess() && priceInDecimal.data.price == conversionRate) {
          const queryResp = await new CurrencyConversionRateModel().updateStatus(
            dbRowId,
            conversionRateConstants.active
          );

          if (!queryResp) {
            return onResolve('Failed to update status.');
          }

          logger.win('Price point updated in contract.');

          const clearCacheResponse = new OstPricePointsCache({ chainId: chainId }).clear();
          if (!clearCacheResponse) {
            return onResolve('Failed to clear cache.');
          }

          return onResolve('success');
        }

        logger.step(
          `dbRowId: ${dbRowId} attemptNo: ${attemptCountForVerifyPriceInContract} price received from contract: ${
            priceInDecimal.data.price
          } but expected was: ${conversionRate}. Waiting for it to match.`
        );

        attemptCountForVerifyPriceInContract += attemptCountForVerifyPriceInContract;

        return setTimeout(loopCompareContractPrice, 10000);
      };
      loopCompareContractPrice();
    });
  }

  /**
   * Return config strategy.
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class.
   *
   * @sets oThis.configStrategyObj
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) {
      return oThis.configStrategyObj;
    }

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifySetPriceInPriceOracleContract,
  coreConstants.icNameSpace,
  'VerifySetPriceInPriceOracleContract'
);

module.exports = {};
