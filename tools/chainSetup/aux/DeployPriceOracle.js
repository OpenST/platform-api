/**
 * Module to deploy price oracle contract.
 *
 * @module tools/chainSetup/aux/DeployPriceOracle
 */

const OpenSTOracle = require('@ostdotcom/ost-price-oracle'),
  deployAndSetOpsAndAdminHelper = new OpenSTOracle.DeployAndSetOpsAndAdminHelper();

const rootPrefix = '../../..',
  StakeCurrenciesModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

/**
 * Class to deploy price oracle contract.
 *
 * @class DeployPriceOracle
 */
class DeployPriceOracle {
  /**
   * Constructor to deploy price oracle contract.
   *
   * @param {object} params
   * @param {string/number} params.auxChainId - auxChainId for which price oracle needs be deployed.
   * @param {string} params.baseCurrencySymbol - base currency symbol.
   * @param {string} params.gasPrice - gas price used for deployment.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.baseCurrencySymbol = params.baseCurrencySymbol;
    oThis.gasPrice = params.gasPrice || contractConstants.zeroGasPrice;

    oThis.contractAddressKind = params.contractAddressKind;

    oThis.quoteCurrency = conversionRateConstants.USD;
    oThis.ownerAddress = '';
    oThis.adminAddress = '';
    oThis.workerAddress = '';
    oThis.wsProvider = '';
    oThis.web3Instance = {};
    oThis.contractAddress = '';
    oThis.baseCurrencyDetails = null;
  }

  /**
   * Perform.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    oThis._validateParams();

    await oThis._fetchBaseCurrencyDetails();

    await oThis._fetchAddresses();

    await oThis._setWeb3Instance();

    await oThis._deployPriceOracleContract();

    await oThis._setOpsAddress();

    await oThis._setAdminAddress();

    await oThis._saveContractAddress();
  }

  /**
   * Validate params
   *
   * @private
   */
  _validateParams() {
    const oThis = this;
    if (!oThis.auxChainId) {
      throw new Error('Aux chain id is mandatory in the parameters.');
    }

    if (!oThis.baseCurrencySymbol || oThis.baseCurrencySymbol.toUpperCase() != oThis.baseCurrencySymbol) {
      throw new Error('Base currency symbol is mandatory and should be in upper case.');
    }
  }

  /**
   * Fetch base currency details
   *
   * @private
   */
  async _fetchBaseCurrencyDetails() {
    const oThis = this;

    let stakeCurrencyBySymbolCache = new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [oThis.baseCurrencySymbol]
    });

    let response = await stakeCurrencyBySymbolCache.fetch();

    oThis.baseCurrencyDetails = response.data[oThis.baseCurrencySymbol];
  }

  /**
   * Fetch relevant addresses.
   *
   * @sets oThis.ownerAddress, oThis.adminAddress, oThis.workerAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchAddresses() {
    const oThis = this;

    // Fetch all addresses associated with aux chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_dpo_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.ownerAddress = chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractOwnerKind].address;
    oThis.adminAddress = chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractAdminKind].address;
    oThis.workerAddress = chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractWorkerKind][0].address;
  }

  /**
   * Set web3 instance.
   *
   * @params {string} address
   *
   * @sets oThis.wsProvider, oThis.web3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId];

    const provider = basicHelper.shuffleArray(auxChainConfig.auxGeth.readWrite.wsProviders);

    oThis.wsProvider = provider[0];
    oThis.web3Instance = web3Provider.getInstance(oThis.wsProvider).web3WsProvider;
  }

  /**
   * Deploy price oracle contract.
   *
   * @sets oThis.contractAddress
   *
   * @return {Promise<void>}
   * @private
   */
  async _deployPriceOracleContract() {
    const oThis = this;

    logger.step(
      `* Deploying Price Oracle contract for base currency: "${
        oThis.baseCurrencyDetails.constants.baseCurrencyCode
      }" to quote currency "${oThis.quoteCurrency}".`
    );

    // Prepare txOptions.
    const txOptions = {
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployPriceOracleContractGas,
      value: contractConstants.zeroValue,
      from: oThis.ownerAddress,
      chainId: oThis.auxChainId
    };

    // Get raw transaction object.
    const txObject = deployAndSetOpsAndAdminHelper.deployRawTx(
      oThis.web3Instance,
      oThis.ownerAddress,
      oThis.baseCurrencyDetails.constants.baseCurrencyCode,
      oThis.quoteCurrency,
      txOptions
    );

    txOptions.data = txObject.encodeABI();

    // Submit transaction.
    const submitTransactionResponse = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      txOptions: txOptions,
      provider: oThis.wsProvider,
      waitTillReceipt: 1
    }).perform();

    if (submitTransactionResponse && submitTransactionResponse.isFailure()) {
      return Promise.reject(submitTransactionResponse);
    }

    // Fetch required attributes.
    const transactionHash = submitTransactionResponse.data.transactionHash,
      transactionReceipt = submitTransactionResponse.data.transactionReceipt;

    oThis.contractAddress = transactionReceipt.contractAddress;

    logger.win('\t Transaction hash: ', transactionHash);
    logger.win('\t Transaction receipt: ', transactionReceipt);
    logger.win('\t Contract Address: ', oThis.contractAddress);

    logger.step(
      `Price oracle contract for base currency:"${
        oThis.baseCurrencyDetails.constants.baseCurrencyCode
      }" to quote currency "${oThis.quoteCurrency}" deployed.`
    );
  }

  /**
   * Set ops address in price oracle contract.
   *
   * @return {Promise<*>}
   * @private
   */
  async _setOpsAddress() {
    const oThis = this;

    logger.step('* Setting opsAddress in Price oracle contract.');

    // Prepare txOptions.
    const txOptions = {
      gasPrice: oThis.gasPrice,
      gas: contractConstants.setPriceOracleContractOpsAddressGas,
      value: contractConstants.zeroValue,
      from: oThis.ownerAddress,
      to: oThis.contractAddress,
      chainId: oThis.auxChainId
    };

    // Get raw transaction object.
    const txObject = deployAndSetOpsAndAdminHelper.setOpsAddressTx(
      oThis.web3Instance,
      oThis.workerAddress,
      oThis.contractAddress,
      txOptions
    );

    txOptions.data = txObject.encodeABI();

    // Submit transaction.
    const submitTransactionResponse = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      txOptions: txOptions,
      provider: oThis.wsProvider,
      waitTillReceipt: 1
    }).perform();

    if (submitTransactionResponse && submitTransactionResponse.isFailure()) {
      return Promise.reject(submitTransactionResponse);
    }

    // Fetch required attributes.
    const transactionHash = submitTransactionResponse.data.transactionHash,
      transactionReceipt = submitTransactionResponse.data.transactionReceipt;

    logger.win('\t Transaction hash: ', transactionHash);
    logger.win('\t Transaction receipt: ', transactionReceipt);

    logger.step('Ops address set in price oracle contract.');
  }

  /**
   * Set admin address in price oracle contract.
   *
   * @return {Promise<*>}
   * @private
   */
  async _setAdminAddress() {
    const oThis = this;

    logger.step('* Setting admin address in price oracle contract.');

    // Prepare txOptions.
    const txOptions = {
      gasPrice: oThis.gasPrice,
      gas: contractConstants.setPriceOracleContractAdminAddressGas,
      value: contractConstants.zeroValue,
      from: oThis.ownerAddress,
      to: oThis.contractAddress,
      chainId: oThis.auxChainId
    };

    // Get raw transaction object.
    const txObject = deployAndSetOpsAndAdminHelper.setAdminAddressTx(
      oThis.web3Instance,
      oThis.adminAddress,
      oThis.contractAddress,
      txOptions
    );

    txOptions.data = txObject.encodeABI();

    // Submit transaction.
    const submitTransactionResponse = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      txOptions: txOptions,
      provider: oThis.wsProvider,
      waitTillReceipt: 1
    }).perform();

    if (submitTransactionResponse && submitTransactionResponse.isFailure()) {
      return Promise.reject(submitTransactionResponse);
    }

    // Fetch required attributes.
    const transactionHash = submitTransactionResponse.data.transactionHash,
      transactionReceipt = submitTransactionResponse.data.transactionReceipt;

    logger.win('\t Transaction hash: ', transactionHash);
    logger.win('\t Transaction receipt: ', transactionReceipt);
    logger.step('Admin address set in price oracle contract.');
  }

  /**
   * Save contract address in table.
   *
   * @return {Promise<void>}
   * @private
   */
  async _saveContractAddress() {
    const oThis = this;

    await new StakeCurrenciesModel()
      .update({
        price_oracle_contract_address: oThis.contractAddress.toLowerCase()
      })
      .where(['id = ?', oThis.baseCurrencyDetails.id])
      .fire();

    // Clear cache - this is in-memory cache clear
    await Promise.all([
      new StakeCurrencyBySymbolCache({
        stakeCurrencySymbols: [oThis.baseCurrencySymbol]
      }).clear(),

      new StakeCurrencyByIdCache({
        stakeCurrencyIds: [oThis.baseCurrencyDetails.id]
      }).clear()
    ]);

    logger.step('Price oracle contract address added in table.');
  }
}

module.exports = DeployPriceOracle;
