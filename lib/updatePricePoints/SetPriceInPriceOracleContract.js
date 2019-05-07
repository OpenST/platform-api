/**
 * Module to set price in price oracle contract.
 *
 * @module lib/updatePricePoints/SetPriceInPriceOracleContract
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  OpenSTOracle = require('@ostdotcom/ost-price-oracle'),
  PriceOracleHelper = OpenSTOracle.PriceOracleHelper;

const rootPrefix = '../..',
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to set price in price oracle contract.
 *
 * @class SetPriceInPriceOracleContract
 */
class SetPriceInPriceOracleContract {
  /**
   * Constructor to set price in price oracle contract.
   *
   * @param {object} params
   * @param {string} params.auxChainId: auxChainId
   * @param {object} params.currentErc20Value: currentErc20Value
   * @param {object} params.pendingTransactionExtraData: pendingTransactionExtraData
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.currentErc20Value = params.currentErc20Value;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;

    oThis.auxGasPrice = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.updatePricePointsGas = null;
    oThis.auxPriceOracleContractAddress = null;
    oThis.auxPriceOracleContractWorkerAddress = null;
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._fetchAddresses();

    await oThis._setWeb3Instance();

    const submitTxRsp = await oThis._setPriceInPriceOracle();

    await oThis._insertPricePointInTable(submitTxRsp.data.transactionHash);

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        taskResponseData: {
          transactionHash: submitTxRsp.data.transactionHash,
          currencyConversionTableId: oThis.currencyConversionTableId,
          currentErc20Value: oThis.currentErc20Value,
          priceOracleContractAddress: oThis.auxPriceOracleContractAddress
        },
        debugParams: {
          priceOracleContractAddress: oThis.auxPriceOracleContractAddress,
          priceOracleWorkerAddress: oThis.auxPriceOracleContractWorkerAddress
        }
      })
    );
  }

  /**
   * Initialize required variables.
   *
   * @sets oThis.chainEndpoint, oThis.auxGasPrice, oThis.updatePricePointsGas
   *
   * @return {Promise<void>}
   * @private
   */
  async _initializeVars() {
    const oThis = this;

    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');
    oThis.auxGasPrice = contractConstants.auxChainGasPrice;
    oThis.updatePricePointsGas = contractConstants.updatePricePointsGas;
  }

  /**
   * Fetch price oracle contract and worker address.
   *
   * @sets oThis.auxPriceOracleContractWorkerAddress
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchAddresses() {
    const oThis = this;

    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_upp_spipo_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.auxPriceOracleContractWorkerAddress =
      chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractWorkerKind][0].address;

    if (oThis.currentErc20Value.baseCurrency === conversionRateConstants.OST) {
      oThis.auxPriceOracleContractAddress =
        chainAddressesRsp.data[chainAddressConstants.auxOstToUsdPriceOracleContractKind].address;
    } else if (oThis.currentErc20Value.baseCurrency === conversionRateConstants.USDC) {
      oThis.auxPriceOracleContractAddress =
        chainAddressesRsp.data[chainAddressConstants.auxUsdcToUsdPriceOracleContractKind].address;
    } else {
      throw new Error(`Invalid baseCurrency ${oThis.currentErc20Value.baseCurrency}`);
    }
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

    oThis.auxWeb3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * Deploy contract.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _setPriceInPriceOracle() {
    const oThis = this;

    // Don't change this conversion to respective decimals, since it is hardcoded in contract.
    const priceResponse = basicHelper.convertToLowerUnit(
        oThis.currentErc20Value.conversionRate,
        coreConstants.USD_DECIMALS
      ),
      amountInWei = priceResponse.toString(10);

    // Get transaction object.
    const txResponse = new PriceOracleHelper(oThis.auxWeb3Instance).setPriceTx(
      oThis.auxWeb3Instance,
      oThis.currentErc20Value.baseCurrency,
      oThis.currentErc20Value.quoteCurrency,
      oThis.auxPriceOracleContractAddress,
      amountInWei,
      oThis.auxGasPrice
    );

    // Prepare params for transaction.
    const encodedABI = txResponse.encodedABI,
      txOptions = {
        from: oThis.auxPriceOracleContractWorkerAddress,
        to: oThis.auxPriceOracleContractAddress,
        value: contractConstants.zeroValue,
        data: encodedABI,
        gas: oThis.updatePricePointsGas,
        gasPrice: oThis.auxGasPrice
      };

    const submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.updatePricePointsKind,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return Promise.resolve(submitTxRsp);
  }

  /**
   * Insert price points into Currency Conversion Rates Table.
   *
   * @param {string} transactionHash
   *
   * @sets oThis.currencyConversionTableId
   *
   * @returns {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _insertPricePointInTable(transactionHash) {
    const oThis = this;

    // Insert current erc20 value in database
    const insertResponse = await new CurrencyConversionRateModel()
      .insert({
        chain_id: oThis.auxChainId,
        base_currency: conversionRateConstants.invertedBaseCurrencies[oThis.currentErc20Value.baseCurrency],
        quote_currency: conversionRateConstants.invertedQuoteCurrencies[oThis.currentErc20Value.quoteCurrency],
        conversion_rate: oThis.currentErc20Value.conversionRate,
        timestamp: oThis.currentErc20Value.timestamp,
        transaction_hash: transactionHash,
        status: conversionRateConstants.invertedStatuses[oThis.currentErc20Value.status]
      })
      .fire();

    if (!insertResponse) {
      logger.error('Error while inserting data in table');

      return Promise.reject(new Error('Error while inserting data in table'));
    }

    oThis.currencyConversionTableId = insertResponse.insertId;
  }

  /**
   * Config strategy
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
  SetPriceInPriceOracleContract,
  coreConstants.icNameSpace,
  'SetPriceInPriceOracleContract'
);

module.exports = {};
