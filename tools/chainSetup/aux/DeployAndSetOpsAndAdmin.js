'use strict';
/**
 * Deploy ops and set
 *
 * @module tools/chainSetup/aux/DeployAndSetOpsAndAdmin
 */
const OpenStOracle = require('@ostdotcom/ost-price-oracle'),
  deployAndSetOpsAndAdminHelper = new OpenStOracle.DeployAndSetOpsAndAdminHelper();

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

/**
 * Class for deploy and set ops contract.
 *
 * @class
 */
class DeployAndSetOpsAndAdmin {
  /**
   * Constructor for deploy and set ops contract.
   *
   * @param {Object} params
   * @param {String/Number} params.auxChainId: auxChainId for which origin-gateway needs be deployed.
   * @param {String} params.baseCurrency: base currency for price oracle contract.
   * @param {String} params.quoteCurrency: quote currency for price oracle contract.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];
    oThis.baseCurrency = params.baseCurrency || conversionRateConstants.OST;
    oThis.quoteCurrency = params.quoteCurrency || conversionRateConstants.USD;

    oThis.configStrategyObj = null;
  }

  /**
   * Perform
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_cs_o_daso_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchAddresses();

    await oThis._setWeb3Instance();

    await oThis._deployPriceOracleContract();

    await oThis._setOpsAddress();

    await oThis._setAdminAddress();
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

    let requiredAddressKinds = [
      chainAddressConst.priceOracleOpsAddressKind,
      chainAddressConst.ownerKind,
      chainAddressConst.adminKind
    ];

    // TODO: Fetch chainOwnerKind instead of ownerKind. Also fetch adminKind.
    let chainAddressRsp = await new ChainAddressModel().fetchAddresses({
      chainId: oThis.auxChainId,
      kinds: requiredAddressKinds
    });

    oThis.priceOracleOpsAddress = chainAddressRsp.data.address[chainAddressConst.priceOracleOpsAddressKind];
    oThis.ownerAddress = chainAddressRsp.data.address[chainAddressConst.ownerKind];
    oThis.adminAddress = chainAddressRsp.data.address[chainAddressConst.adminKind];
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

    oThis.wsProvider = auxChainConfig.auxGeth.readWrite.wsProviders[0];
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

    logger.step('Deploying Price oracle contract.');

    // Prepare txOptions.
    let txOptions = {
      gasPrice: contractConstants.zeroGasPrice,
      gas: '579067',
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

    logger.step('Price oracle contract deployed.');
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

    logger.step('Setting opsAddress in Price oracle contract.');

    // Prepare txOptions.
    let txOptions = {
      gasPrice: contractConstants.zeroGasPrice,
      gas: '50000',
      value: contractConstants.zeroValue,
      from: oThis.ownerAddress,
      to: oThis.contractAddress,
      chainId: oThis.auxChainId
    };

    // Get raw transaction object.
    let txObject = deployAndSetOpsAndAdminHelper.setOpsAddressTx(
      oThis.web3Instance,
      oThis.priceOracleOpsAddress,
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

    logger.step('Setting adminAddress in Price oracle contract.');

    // Prepare txOptions.
    let txOptions = {
      gasPrice: contractConstants.zeroGasPrice,
      gas: '50000',
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

    // Insert priceOracleContractAddress in chainAddresses table.
    await new ChainAddressModel().insertAddress({
      address: oThis.contractAddress,
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      chainKind: coreConstants.auxChainKind,
      kind: chainAddressConst.priceOracleContractKind,
      status: chainAddressConst.activeStatus
    });

    logger.step('Price oracle contract address added in table.');
  }
}

module.exports = DeployAndSetOpsAndAdmin;
