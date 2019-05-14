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
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
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
   * @param {string} contractSymbol : ERC20 contract symbol
   * @param {string} contractAddress: ERC20 contract address.
   *
   * @constructor
   */
  constructor(contractSymbol, contractAddress) {
    const oThis = this;

    oThis.contractSymbol = contractSymbol;
    oThis.contractAddress = contractAddress;

    oThis.web3Instance = {};
    oThis.stakeCurrenciesDetails = null;
    oThis.contractDetailsFromBlockChain = {};
  }

  /**
   * Performer.
   *
   * @return {Promise<*|number>}
   */
  async perform() {
    const oThis = this;

    await oThis.getWeb3Provider();

    await oThis.getStakeCurrencyDetails();

    await oThis.getContractDetailsFromBlockChain();

    await oThis.validateData();

    return oThis.updateEntryInStakeCurrencies();
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
   * Fetch details.
   *
   */
  async getStakeCurrencyDetails() {
    const oThis = this;

    let stakeCurrencyResponse = await new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [oThis.contractSymbol]
    }).fetch();

    if (stakeCurrencyResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_sc_usct_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.stakeCurrenciesDetails = stakeCurrencyResponse.data[oThis.contractSymbol];
  }

  /**
   * Fetch contract decimal values.
   *
   * @return {Promise<[name, symbol, decimals]>}
   */
  async getContractDetailsFromBlockChain() {
    const oThis = this;

    const genericErc20ContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.genericErc20),
      promises = [];

    genericErc20ContractObj.options.address = oThis.contractAddress;

    promises.push(
      genericErc20ContractObj.methods
        .symbol()
        .call({})
        .then(function(resp) {
          oThis.contractDetailsFromBlockChain['symbol'] = resp;
        })
    );

    promises.push(
      genericErc20ContractObj.methods
        .decimals()
        .call({})
        .then(function(resp) {
          oThis.contractDetailsFromBlockChain['decimal'] = resp;
        })
    );

    await Promise.all(promises);
  }

  /**
   *
   * validate if data passed in params in in sync with data fetched from contract
   *
   * @return {Promise}
   */
  async validateData() {
    const oThis = this;

    if (oThis.contractSymbol === 'OST') {
      // special handling for OST
      if (oThis.contractDetailsFromBlockChain['symbol'] !== 'ST') {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_sc_usct_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: {
              contractSymbolFromParams: oThis.contractSymbol,
              contractDetailsFromBlockChain: oThis.contractDetailsFromBlockChain['symbol']
            }
          })
        );
      }
    } else if (oThis.contractSymbol !== oThis.contractDetailsFromBlockChain['symbol']) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_sc_usct_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            contractSymbolFromParams: oThis.contractSymbol,
            contractDetailsFromBlockChain: oThis.contractDetailsFromBlockChain['symbol']
          }
        })
      );
    }
  }

  /**
   * update contract entry in stake currencies table.
   */
  async updateEntryInStakeCurrencies() {
    const oThis = this;

    const updateResponse = await new StakeCurrenciesModel()
      .update({
        decimal: oThis.contractDetailsFromBlockChain['decimal'],
        contract_address: basicHelper.sanitizeAddress(oThis.contractAddress)
      })
      .where({ symbol: oThis.contractSymbol })
      .fire();

    // Clear cache - this is in-memory cache clear
    await Promise.all([
      new StakeCurrencyBySymbolCache({
        stakeCurrencySymbols: [oThis.contractSymbol]
      }).clear(),

      new StakeCurrencyByIdCache({
        stakeCurrencyIds: [oThis.stakeCurrenciesDetails.id]
      }).clear()
    ]);

    logger.log('Entry created successfully in stake_currencies table.');

    return updateResponse;
  }
}

module.exports = UpdateStakeCurrenciesTable;
