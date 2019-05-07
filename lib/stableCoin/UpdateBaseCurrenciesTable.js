/**
 * Module to add entry in base currencies table in DynamoDB.
 *
 * @module lib/stableCoin/UpdateBaseCurrenciesTable
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

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
   * @param {string} contractAddress: ERC20 contract address.
   *
   * @constructor
   */
  constructor(contractAddress) {
    const oThis = this;

    oThis.contractAddress = contractAddress;

    oThis.web3Instance = {};
    oThis.contractDetails = {};
  }

  /**
   * Performer.
   *
   * @return {Promise<*|number>}
   */
  async perform() {
    const oThis = this;

    await oThis.getConfigStrategy();

    await oThis.getWeb3Provider();

    await oThis.getContractDetails();

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
   * Create web3 instance.
   *
   * @return {Promise<void>}
   */
  async getWeb3Provider() {
    const oThis = this;

    const configForChain = oThis.configStrategy.originGeth,
      readWriteConfig = configForChain[configStrategyConstants.gethReadOnly],
      provider = readWriteConfig.wsProvider ? readWriteConfig.wsProvider : readWriteConfig.rpcProvider;

    oThis.web3Instance = web3Provider.getInstance(provider).web3WsProvider;
  }

  /**
   * Fetch contract name, symbol and decimal values.
   *
   * @return {Promise<[name, symbol, decimals]>}
   */
  async getContractDetails() {
    const oThis = this;

    const genericErc20ContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.genericErc20),
      promises = [];

    genericErc20ContractObj.options.address = oThis.contractAddress;
    promises.push(
      genericErc20ContractObj.methods
        .name()
        .call({})
        .then(function(resp) {
          oThis.contractDetails['name'] = resp;
        })
    );
    promises.push(
      genericErc20ContractObj.methods
        .symbol()
        .call({})
        .then(function(resp) {
          oThis.contractDetails['symbol'] = resp;
        })
    );
    promises.push(
      genericErc20ContractObj.methods
        .decimals()
        .call({})
        .then(function(resp) {
          oThis.contractDetails['decimals'] = resp;
        })
    );

    await Promise.all(promises);
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

    if (oThis.contractDetails['name'] === contractConstants.usdcContractName) {
      oThis.contractDetails['name'] = 'USD Coin';
    }

    // Replace 'ST' symbol with 'OST'.
    if (oThis.contractDetails['symbol'] === 'ST') {
      oThis.contractDetails['symbol'] = 'OST';
    }

    await baseCurrencyObject.insertBaseCurrency({
      name: oThis.contractDetails['name'],
      symbol: oThis.contractDetails['symbol'],
      decimal: oThis.contractDetails['decimals'],
      contractAddress: basicHelper.sanitizeAddress(oThis.contractAddress)
    });

    logger.log('Entry created successfully in base currencies table.');
  }
}

module.exports = UpdateBaseCurrenciesTable;
