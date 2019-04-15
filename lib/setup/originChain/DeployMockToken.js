/**
 * Module to deploy mock token.
 *
 * @module lib/setup/originChain/DeployMockToken
 */

const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  CoreBins = require(rootPrefix + '/config/CoreBins'),
  DeployerClass = require(rootPrefix + '/tools/helpers/Deploy'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  NonceGetForTransaction = require(rootPrefix + '/lib/nonce/get/ForTransaction'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  UpdateBaseCurrenciesTable = require(rootPrefix + '/lib/stableCoin/UpdateBaseCurrenciesTable'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'),
  UpdateStakeCurrenciesTable = require(rootPrefix + '/lib/stableCoin/UpdateStakeCurrenciesTable'),
  EstimateOriginChainGasPrice = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to deploy mock token.
 *
 * @class DeployMockToken
 */
class DeployMockToken {
  /**
   * Constructor to deploy mock token.
   *
   * @constructor
   */
  constructor() {
    const oThis = this;

    oThis.gasPrice = 0;
    oThis.signerAddress = '';
    oThis.signerKey = '';
    oThis.web3InstanceObj = {};
  }

  /**
   * Main performer of class.
   *
   * @return {*}
   */
  perform() {
    const oThis = this;

    if (basicHelper.isProduction() && basicHelper.isMainSubEnvironment()) {
      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_dmt_1',
        api_error_identifier: 'action_prohibited_in_prod_main',
        debug_options: {}
      });
    }

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/setup/originChain/DeployMockToken.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_dmt_2',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.fetchSignerAddress();

    await oThis.fetchSignerKey();

    await oThis.setGasPrice();

    await oThis.getWeb3Instance();

    oThis.addKeyToWallet();

    const deployerResponse = await oThis.deployContract();

    oThis.removeKeyFromWallet();

    await oThis.insertIntoChainSetupLogs(chainSetupConstants.deployBaseContractStepKind, deployerResponse);

    if (deployerResponse.isFailure()) {
      logger.error(`Error while deploying mockToken contract. Response: ${deployerResponse}`);

      return deployerResponse;
    }

    const mockTokenContractAddress = deployerResponse.data.contractAddress;

    await oThis.insertIntoStakeCurrencies(mockTokenContractAddress);

    await oThis.insertIntoBaseCurrencies(mockTokenContractAddress);

    return responseHelper.successWithData({
      mockTokenContractAddress: mockTokenContractAddress
    });
  }

  /**
   * Fetch signer address.
   *
   * @sets oThis.signerAddress
   *
   * @return {Promise<never>}
   */
  async fetchSignerAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_oc_dmt_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.signerAddress = chainAddressesRsp.data[chainAddressConstants.originDeployerKind].address;
  }

  /**
   * Fetch signer address private key.
   *
   * @sets oThis.signerKey
   *
   * @return {Promise<void>}
   */
  async fetchSignerKey() {
    const oThis = this;

    const addressPrivateKeyCache = new AddressPrivateKeyCache({ address: oThis.signerAddress });

    const cacheResp = await addressPrivateKeyCache.fetchDecryptedData();

    oThis.signerKey = cacheResp.data.private_key_d;
  }

  /**
   * Get provider from config.
   *
   * @sets oThis.originChainId
   *
   * @return {Promise<any>}
   * @private
   */
  async _getProviderFromConfig() {
    const oThis = this;

    const csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      provider = readWriteConfig.wsProvider ? readWriteConfig.wsProvider : readWriteConfig.rpcProvider;

    oThis.originChainId = configForChain.chainId;

    return provider;
  }

  /**
   * Get web3instance to interact with chain.
   *
   * @sets oThis.web3InstanceObj
   */
  async getWeb3Instance() {
    const oThis = this;

    const chainEndpoint = await oThis._getProviderFromConfig();

    oThis.web3InstanceObj = web3Provider.getInstance(chainEndpoint).web3WsProvider;
  }

  /**
   * Set gas price.
   *
   * @sets oThis.gasPrice
   */
  async setGasPrice() {
    const oThis = this;

    const gasPriceCacheObj = new EstimateOriginChainGasPrice(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.gasPrice = gasPriceRsp.data;
  }

  /**
   * Fetch nonce (calling this method means incrementing nonce in cache, use judiciously).
   *
   * @param {string} address
   *
   * @return {Promise<number>}
   */
  async fetchNonce(address) {
    const oThis = this;

    return new NonceGetForTransaction({
      address: address,
      chainId: oThis.originChainId
    }).getNonce();
  }

  /**
   * Add signer key to wallet.
   */
  addKeyToWallet() {
    const oThis = this;

    oThis.web3InstanceObj.eth.accounts.wallet.add(oThis.signerKey);
  }

  /**
   * Deploy contract.
   *
   * @return {Promise<*>}
   */
  async deployContract() {
    const oThis = this;

    const nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    const deployParams = {
      deployerAddr: oThis.signerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployMockTokenGas,
      web3Provider: oThis.web3InstanceObj,
      contractBin: CoreBins.mockToken,
      contractAbi: CoreAbis.mockToken,
      nonce: nonceRsp.data.nonce
    };

    const deployerObj = new DeployerClass(deployParams),
      deployerResponse = await deployerObj.perform().catch(function(errorResponse) {
        logger.error(errorResponse);

        return errorResponse;
      });

    deployerResponse.debugOptions = {
      inputParams: {
        signerAddress: oThis.signerAddress
      },
      processedParams: {}
    };

    return deployerResponse;
  }

  /**
   * Remove signer key to wallet.
   */
  removeKeyFromWallet() {
    const oThis = this;

    oThis.web3InstanceObj.eth.accounts.wallet.remove(oThis.signerKey);
  }

  /**
   * Insert entry into chain setup logs table.
   *
   * @param {string} step
   * @param {object} response
   *
   * @return {Promise<void>}
   */
  async insertIntoChainSetupLogs(step, response) {
    const oThis = this;

    const insertParams = {
      chainId: oThis.originChainId,
      chainKind: coreConstants.originChainKind,
      stepKind: step,
      debugParams: response.debugOptions,
      transactionHash: response.data.transactionHash
    };

    if (response.isSuccess()) {
      insertParams.status = chainSetupConstants.successStatus;
    } else {
      insertParams.status = chainSetupConstants.failureStatus;
      insertParams.debugParams.errorResponse = response.toHash();
    }

    await new ChainSetupLogModel().insertRecord(insertParams);

    return responseHelper.successWithData({});
  }

  /**
   * Create mockToken entry in stake currencies table.
   *
   * @param {string} mockTokenContractAddress
   *
   * @return {Promise<void/object>}
   */
  async insertIntoStakeCurrencies(mockTokenContractAddress) {
    await new UpdateStakeCurrenciesTable(mockTokenContractAddress).perform();
  }

  /**
   * Create mockToken entry in base currencies table in DynamoDB.
   *
   * @param {string} mockTokenContractAddress
   *
   * @return {Promise<void/object>}
   */
  async insertIntoBaseCurrencies(mockTokenContractAddress) {
    await new UpdateBaseCurrenciesTable(mockTokenContractAddress).perform();
  }
}

module.exports = DeployMockToken;
