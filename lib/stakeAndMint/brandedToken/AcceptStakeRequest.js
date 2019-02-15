'use strict';
/**
 * Kyc worker would accept stake and assign further work to Facilitator
 *
 * @module lib/stakeAndMint/brandedToken/AcceptStakeRequest
 */
const BigNumber = require('bignumber.js'),
  MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  BrandedToken = require('@openstfoundation/brandedtoken.js');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

class AcceptStakeByWorker extends StakeAndMintBase {
  /**
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.amountToStake = params.amountToStake;
    oThis.stakerAddress = params.stakerAddress;
    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.requestStakeHash = params.requestStakeHash;
    oThis.facilitator = params.facilitator;

    oThis.brandedTokenContract = null;
    oThis.secretString = null;
    oThis.btStakeHelper = null;
  }

  /**
   * Async performer
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateStakeAmount();

    await oThis._fetchStakerGatewayComposer();

    await oThis._fetchRequiredAddresses();

    await oThis._setOriginWeb3Instance();

    let response = await oThis._performAcceptStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: {
            chainId: oThis.originChainId,
            transactionHash: response.data.transactionHash,
            secretString: oThis.secretString
          }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          taskResponseData: { err: JSON.stringify(response), secretString: oThis.secretString }
        })
      );
    }
  }

  /**
   * Fetch required addresses
   * @private
   */
  async _fetchRequiredAddresses() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
    oThis.brandedTokenContract = addressesResp.data[tokenAddressConstants.brandedTokenContract];
    oThis.originWorker = addressesResp.data[tokenAddressConstants.originWorkerAddressKind][0];
  }

  /**
   * Validate stake amount
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _validateStakeAmount() {
    const oThis = this;
    if (!oThis.amountToStake) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToStake: 'Stake Amount is invalid' + oThis.amountToStake }
        })
      );
    }
    oThis.amountToStake = new BigNumber(oThis.amountToStake);

    return oThis.amountToStake;
  }

  /**
   * _getHashLock
   *
   * @return {Promise<void>}
   * @private
   */
  _getHashLock() {
    const oThis = this;

    let response = MosaicTbd.Helpers.StakeHelper.createSecretHashLock();

    oThis.secretString = response.secret;
    return response.hashLock;
  }

  /**
   * Get BT stake helper
   *
   * @return {Promise<void>}
   * @private
   */
  _getBTStakeHelper(web3Instance) {
    const oThis = this;

    if (!oThis.btStakeHelper) {
      oThis.btStakeHelper = new BrandedToken.Helpers.StakeHelper(
        web3Instance,
        oThis.brandedTokenContract,
        web3Instance.utils.toChecksumAddress(oThis.gatewayComposer)
      );
    }

    return oThis.btStakeHelper;
  }

  /**
   * Get EIP 712 Signature of worker
   *
   * @return {Promise<void>}
   * @private
   */
  async _getEIP712SignedSignature() {
    const oThis = this;

    let workerAddress = oThis.originWorker,
      signerWeb3Instance = new SignerWeb3Provider(oThis.originWsProviders[0]),
      web3Instance = await signerWeb3Instance.getInstance();

    // Fetch Staker Branded Token nonce to sign
    let stakerBtNonce = await oThis
      ._getBTStakeHelper(web3Instance)
      ._getStakeRequestRawTx(oThis.requestStakeHash, web3Instance);

    // Add worker key
    let checkSumWorkerAddress = web3Instance.utils.toChecksumAddress(workerAddress);
    await signerWeb3Instance.addAddressKey(workerAddress);

    // Sign Transaction
    const stakeRequestTypedData = await oThis
      ._getBTStakeHelper()
      .getStakeRequestTypedData(oThis.amountToStake.toString(10), stakerBtNonce.nonce);

    logger.log('stakeRequestTypedData', stakeRequestTypedData);

    // 2. Generate EIP712 Signature.
    const workerAccountInstance = web3Instance.eth.accounts.wallet[checkSumWorkerAddress];
    const signature = await workerAccountInstance.signEIP712TypedData(stakeRequestTypedData);
    // Remove worker key from web 3
    signerWeb3Instance.removeAddressKey(workerAddress);

    return signature;
  }

  /**
   * Perform Confirm stake intent on CoGateway
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _performAcceptStake() {
    const oThis = this;

    // Get EIP 712 signature from OST Worker
    let signature = await oThis._getEIP712SignedSignature(),
      hashLock = oThis._getHashLock();

    let txObject = await oThis
        ._getBTStakeHelper()
        ._acceptStakeRequestRawTx(oThis.requestStakeHash, signature, oThis.facilitator, hashLock),
      data = txObject.encodeABI(),
      gasPrice = await oThis._fetchGasPrice(), // origin gas price
      txOptions = {
        gasPrice: gasPrice,
        gas: contractConstants.acceptStakeSTGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.facilitator,
      oThis.gatewayComposer,
      txOptions,
      data
    );
  }

  /**
   * Get origin chain gas price
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchGasPrice() {
    const oThis = this;

    let dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    return dynamicGasPriceResponse.data;
  }
}

module.exports = AcceptStakeByWorker;
