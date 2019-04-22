/**
 * Module to save stake currency details in stake currencies and base currencies.
 *
 * @module lib/setup/originChain/SaveStakeCurrencyDetails
 */

const rootPrefix = '../../..',
  UpdateBaseCurrenciesTable = require(rootPrefix + '/lib/stableCoin/UpdateBaseCurrenciesTable'),
  UpdateStakeCurrenciesTable = require(rootPrefix + '/lib/stableCoin/UpdateStakeCurrenciesTable'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to save stake currency details in stake currencies and base currencies.
 *
 * @class SaveStakeCurrencyDetails
 */
class SaveStakeCurrencyDetails {
  /**
   * Constructor to save stake currency details in stake currencies and base currencies.
   *
   * @param {string} contractAddress
   *
   * @constructor
   */
  constructor(contractAddress) {
    const oThis = this;

    oThis.contractAddress = contractAddress;
  }

  /**
   * Perform.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/setup/originChain/SaveStakeCurrencyDetails.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_sscd_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<string>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('** Insert base currency contract details into stake currencies table.');
    await oThis._insertInStakeCurrencies();

    logger.step('** Insert base currency contract details into base currencies table.');
    await oThis._insertInBaseCurrencies();

    return 'Base currency contract details successfully stored in stake currencies and base currencies table.';
  }

  /**
   * Create base currency entry in stake currencies table.
   *
   * @return {Promise<void>}
   * @private
   */
  async _insertInStakeCurrencies() {
    const oThis = this;

    await new UpdateStakeCurrenciesTable(oThis.contractAddress).perform();
  }

  /**
   * Create base currency entry in base currencies table in DynamoDB.
   *
   * @return {Promise<void>}
   * @private
   */
  async _insertInBaseCurrencies() {
    const oThis = this;

    await new UpdateBaseCurrenciesTable(oThis.contractAddress).perform();
  }
}

module.exports = SaveStakeCurrencyDetails;
