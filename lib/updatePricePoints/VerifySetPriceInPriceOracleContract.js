/**
 * Module to verify set price in price oracle contract.
 *
 * @module lib/updatePricePoints/VerifySetPriceInPriceOracleContract
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate');

/**
 * Class to verify set price in price oracle contract transaction status
 *
 * @class
 */
class VerifySetPriceInPriceOracleContract {
  /**
   * Constructor to verify set price in price oracle contract transaction status
   *
   * @param {Object} params
   * @param {Integer|String} params.auxChainId - auxChainId
   * @param {Integer} params.dbRowId - dbRowId
   * @param {String} params.transactionHash - transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.dbRowId = params.dbRowId;
    oThis.transactionHash = params.transactionHash;
  }

  /**
   * Perform
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

    let txSuccessRsp = await new CheckTxStatus({
      chainId: oThis.auxChainId,
      transactionHash: oThis.transactionHash
    }).perform();

    if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);

    await oThis._updateTxHashInTable();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone
    });
  }

  /**
   * Update Tx Hash in Currency Conversion Rates Table
   *
   * @returns {Promise<*>}
   * @private
   */
  async _updateTxHashInTable() {
    const oThis = this;

    // Update transaction hash
    const updateTransactionResponse = await new CurrencyConversionRateModel().updateTransactionHash(
      oThis.dbRowId,
      oThis.transactionHash
    );
    if (!updateTransactionResponse) {
      logger.error('Error while updating transactionHash in table.');

      return Promise.reject();
    }
    return Promise.resolve(updateTransactionResponse);
  }
}

module.exports = VerifySetPriceInPriceOracleContract;
