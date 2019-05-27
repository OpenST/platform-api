/**
 * Module to add entry in base currencies table in DynamoDB.
 *
 * @module lib/stableCoin/UpdateBaseCurrenciesTable
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  StakeCurrencyCacheBySymbol = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/shared/BaseCurrency');

/**
 * Class to update base currencies table in DynamoDB.
 *
 * @class UpdateBaseCurrenciesTable
 */
class UpdateBaseCurrenciesTable {
  /**
   * Constructor to update base currencies table in DynamoDB.
   *
   * @param {string} contractSymbol : ERC20 contract symbol
   * @param {string} contractAddress: ERC20 contract address.
   *
   * @constructor
   */
  constructor(contractSymbol, contractAddress) {
    const oThis = this;

    oThis.contractSymbol = contractSymbol;
    oThis.contractAddress = contractAddress;

    oThis.stakeCurrenciesDetails = null;
  }

  /**
   * Performer.
   *
   * @return {Promise<*|number>}
   */
  async perform() {
    const oThis = this;

    await oThis.getConfigStrategy();

    await oThis.getStakeCurrencyDetails();

    await oThis.createEntryInBaseCurrencies();
  }

  /**
   * Fetch config strategy.
   *
   * @return {Promise<void>}
   */
  async getConfigStrategy() {
    const oThis = this;

    const strategyByChainHelper = new StrategyByChainHelper(0, 0),
      strategyFetchRsp = await strategyByChainHelper.getComplete();

    oThis.configStrategy = strategyFetchRsp.data;
  }

  /**
   * Fetch details.
   *
   */
  async getStakeCurrencyDetails() {
    const oThis = this;

    let stakeCurrencyResponse = await new StakeCurrencyCacheBySymbol({
      stakeCurrencySymbols: [oThis.contractSymbol]
    }).fetch();

    if (stakeCurrencyResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_sc_ubct_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.stakeCurrenciesDetails = stakeCurrencyResponse.data[oThis.contractSymbol];
  }

  /**
   * Create contract entry in base currencies table.
   *
   * @return {Promise<*|number>}
   */
  async createEntryInBaseCurrencies() {
    const oThis = this;

    const ic = new InstanceComposer(oThis.configStrategy),
      BaseCurrencyModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BaseCurrency');

    const baseCurrencyObject = new BaseCurrencyModel({});

    await baseCurrencyObject.insertBaseCurrency({
      symbol: oThis.contractSymbol,
      name: oThis.stakeCurrenciesDetails.name,
      decimal: oThis.stakeCurrenciesDetails.decimal,
      contractAddress: basicHelper.sanitizeAddress(oThis.contractAddress)
    });

    logger.log('Entry created successfully in base currencies table.');
  }
}

module.exports = UpdateBaseCurrenciesTable;
