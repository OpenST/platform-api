/**
 * Module to deploy price oracle contract.
 *
 * @module tools/chainSetup/aux/DeployPriceOracle
 */

const OpenSTOracle = require('@ostdotcom/ost-price-oracle'),
  deployAndSetOpsAndAdminHelper = new OpenSTOracle.DeployAndSetOpsAndAdminHelper();

const rootPrefix = '../../..',
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

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
   * @param {string/number} params.auxChainId: auxChainId for which origin-gateway needs be deployed.
   * @param {string} params.baseCurrency: base currency for price oracle contract.
   * @param {string} params.quoteCurrency: quote currency for price oracle contract.
   * @param {string} params.gasPrice: gas price for price oracle contract.
   * @param {string} params.contractAddressKind: contract address kind for price oracle contract.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.baseCurrency = params.baseCurrency;
    oThis.quoteCurrency = params.quoteCurrency;
    oThis.contractAddressKind = params.contractAddressKind;
    oThis.gasPrice = params.gasPrice || contractConstants.zeroGasPrice;

    oThis.ownerAddress = '';
    oThis.adminAddress = '';
    oThis.workerAddress = '';
    oThis.wsProvider = '';
    oThis.web3Instance = {};
    oThis.contractAddress = '';
  }

  /**
   * Perform.
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
   * Validate input parameters.
   */
  validateParams() {
    const oThis = this;
    if (!oThis.auxChainId || !oThis.baseCurrency || !oThis.quoteCurrency || !oThis.contractAddressKind) {
      throw new Error(
        'Incorrect parameters. Please check baseCurrency(OST, USDC), quoteCurrency(USD), auxChainId and contract address kind are valid'
      );
    }
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
      '* Deploying Price Oracle contract for base currency:"' +
        oThis.baseCurrency +
        '" to quote currency:"' +
        oThis.quoteCurrency,
      '"'
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
      oThis.baseCurrency,
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
      'Price oracle contract for base currency:"' + oThis.baseCurrency + '" to quote currency:"' + oThis.quoteCurrency,
      '" deployed.'
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

    logger.step('opsAddress set in price oracle contract.');
  }

  /**
   * Set admin address in price oracle contract.
   *
   * @return {Promise<*>}
   * @private
   */
  async _setAdminAddress() {
    const oThis = this;

    logger.step('* Setting adminAddress in Price oracle contract.');

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
    logger.step('adminAddress set in price oracle contract.');
  }

  /**
   * Save contract address in table.
   *
   * @return {Promise<void>}
   * @private
   */
  async _saveContractAddress() {
    const oThis = this;

    // Insert priceOracleContractAddress in chainAddresses table.
    await new ChainAddressModel().insertAddress({
      address: oThis.contractAddress.toLowerCase(),
      associatedAuxChainId: oThis.auxChainId,
      addressKind: oThis.contractAddressKind,
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
