'use strict';
/**
 * Deploy Price Oracle
 *
 * @module tools/chainSetup/aux/DeployPriceOracle
 */
const OpenSTOracle = require('@ostdotcom/ost-price-oracle'),
  deployAndSetOpsAndAdminHelper = new OpenSTOracle.DeployAndSetOpsAndAdminHelper();

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

/**
 * Class for deploy and set ops contract.
 *
 * @class
 */
class DeployPriceOracle {
  /**
   * Constructor for deploy and set ops contract.
   *
   * @param {Object} params
   * @param {String/Number} params.auxChainId: auxChainId for which origin-gateway needs be deployed.
   * @param {String} params.baseCurrency: base currency for price oracle contract.
   * @param {String} params.quoteCurrency: quote currency for price oracle contract.
   * @param {String} params.gasPrice: gas price for price oracle contract.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.baseCurrency = params.baseCurrency;
    oThis.quoteCurrency = params.quoteCurrency;
    oThis.gasPrice = params.gasPrice || contractConstants.zeroGasPrice;

    oThis.configStrategyObj = null;
  }

  /**
   * Perform
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    oThis.validateParams();

    await oThis._fetchAddresses();

    await oThis._setWeb3Instance();

    await oThis._deployPriceOracleContract();

    await oThis._setOpsAddress();

    await oThis._setAdminAddress();

    await oThis._saveContractAddress();
  }

  /**
   *
   * @returns {Promise}
   */
  validateParams() {
    const oThis = this;
    if (!oThis.auxChainId || !oThis.baseCurrency || !oThis.quoteCurrency) {
      throw 'Incorrect parameters. Please check baseCurrency(OST, USDC), quoteCurrency(USD), and auxChainId are valid';
    }
  }

  /**
   * Fetch relevant addresses.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _fetchAddresses() {
    const oThis = this;

    // Fetch all addresses associated with aux chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_dpo_2',
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
   * @params {String} address
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId];

    let provider = basicHelper.shuffleArray(auxChainConfig.auxGeth.readWrite.wsProviders);

    oThis.wsProvider = provider[0];
    oThis.web3Instance = web3Provider.getInstance(oThis.wsProvider).web3WsProvider;
  }

  /**
   * Deploy price oracle contract
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _deployPriceOracleContract() {
    const oThis = this;

    logger.step(
      '* Deploying Price Oracle contract for base currency:"' +
        oThis.baseCurrency +
        '" to quote currency:"' +
        oThis.quoteCurrency,
      '"'
    );

    // Prepare txOptions.
    let txOptions = {
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployPriceOracleContractGas,
      value: contractConstants.zeroValue,
      from: oThis.ownerAddress,
      chainId: oThis.auxChainId
    };

    // Get raw transaction object.
    let txObject = deployAndSetOpsAndAdminHelper.deployRawTx(
      oThis.web3Instance,
      oThis.ownerAddress,
      oThis.baseCurrency,
      oThis.quoteCurrency,
      txOptions
    );

    txOptions['data'] = txObject.encodeABI();

    // Submit transaction.
    let submitTransactionResponse = await new SubmitTransaction({
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
      'Price oracle contract for base currency:"' + oThis.baseCurrency + '" to quote currency:"' + oThis.quoteCurrency,
      '" deployed.'
    );
  }

  /**
   * Set ops address in price oracle contract.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _setOpsAddress() {
    const oThis = this;

    logger.step('* Setting opsAddress in Price oracle contract.');

    // Prepare txOptions.
    let txOptions = {
      gasPrice: oThis.gasPrice,
      gas: contractConstants.setPriceOracleContractOpsAddressGas,
      value: contractConstants.zeroValue,
      from: oThis.ownerAddress,
      to: oThis.contractAddress,
      chainId: oThis.auxChainId
    };

    // Get raw transaction object.
    let txObject = deployAndSetOpsAndAdminHelper.setOpsAddressTx(
      oThis.web3Instance,
      oThis.workerAddress,
      oThis.contractAddress,
      txOptions
    );

    txOptions['data'] = txObject.encodeABI();

    // Submit transaction.
    let submitTransactionResponse = await new SubmitTransaction({
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

    logger.step('opsAddress set in price oracle contract.');
  }

  /**
   * Set admin address in price oracle contract.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _setAdminAddress() {
    const oThis = this;

    logger.step('* Setting adminAddress in Price oracle contract.');

    // Prepare txOptions.
    let txOptions = {
      gasPrice: oThis.gasPrice,
      gas: contractConstants.setPriceOracleContractAdminAddressGas,
      value: contractConstants.zeroValue,
      from: oThis.ownerAddress,
      to: oThis.contractAddress,
      chainId: oThis.auxChainId
    };

    // Get raw transaction object.
    let txObject = deployAndSetOpsAndAdminHelper.setAdminAddressTx(
      oThis.web3Instance,
      oThis.adminAddress,
      oThis.contractAddress,
      txOptions
    );

    txOptions['data'] = txObject.encodeABI();

    // Submit transaction.
    let submitTransactionResponse = await new SubmitTransaction({
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
    logger.step('adminAddress set in price oracle contract.');
  }

  async _saveContractAddress() {
    const oThis = this;

    // Insert priceOracleContractAddress in chainAddresses table.
    await new ChainAddressModel().insertAddress({
      address: oThis.contractAddress.toLowerCase(),
      associatedAuxChainId: oThis.auxChainId,
      addressKind: chainAddressConstants.auxOstToUsdPriceOracleContractKind,
      deployedChainId: oThis.auxChainId,
      deployedChainKind: coreConstants.auxChainKind,
      status: chainAddressConstants.activeStatus
    });

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }).clear();

    logger.step('Price oracle contract address added in table.');
  }
}

module.exports = DeployPriceOracle;
