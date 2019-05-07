/**
 * Module to add entry in stake currencies table.
 *
 * @module lib/stableCoin/UpdateStakeCurrenciesTable
 */

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  StakeCurrenciesModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  ConfigStrategyByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to update stake currencies table.
 *
 * @class UpdateStakeCurrenciesTable
 */
class UpdateStakeCurrenciesTable {
  /**
   * Constructor to update stake currencies table.
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

    await oThis.getWeb3Provider();

    await oThis.getContractDetails();

    return oThis.createEntryInStakeCurrencies();
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
   * Create contract entry in stake currencies table.
   *
   * @return {Promise<*|number>}
   */
  async createEntryInStakeCurrencies() {
    const oThis = this;

    if (oThis.contractDetails['name'] === contractConstants.usdcContractName) {
      oThis.contractDetails['name'] = 'USD Coin';
    }

    // Replace 'ST' symbol with 'OST'.
    if (oThis.contractDetails['symbol'] === 'ST') {
      oThis.contractDetails['symbol'] = 'OST';
    }

    const insertResponse = await new StakeCurrenciesModel()
      .insert({
        name: oThis.contractDetails['name'],
        symbol: oThis.contractDetails['symbol'],
        decimal: oThis.contractDetails['decimals'],
        contract_address: basicHelper.sanitizeAddress(oThis.contractAddress)
      })
      .fire();

    logger.log('Entry created successfully in stake_currencies table.');

    return insertResponse.insertId;
  }
}

module.exports = UpdateStakeCurrenciesTable;
