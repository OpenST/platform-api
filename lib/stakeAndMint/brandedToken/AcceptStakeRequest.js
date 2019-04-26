/**
 * Module for KYC worker to accept stake and assign further work to Facilitator.
 *
 * @module lib/stakeAndMint/brandedToken/AcceptStakeRequest
 */

const BigNumber = require('bignumber.js'),
  MosaicJs = require('@openst/mosaic.js'),
  BrandedToken = require('@openst/brandedtoken.js');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class for KYC worker to accept stake and assign further work to Facilitator.
 *
 * @class AcceptStakeByWorker
 */
class AcceptStakeByWorker extends StakeAndMintBase {
  /**
   * Constructor for KYC worker to accept stake and assign further work to Facilitator.
   *
   * @param {object} params
   * @param {number} params.tokenId
   * @param {string} params.amountToStake
   * @param {string} params.stakerAddress
   * @param {number} params.originChainId
   * @param {number} params.auxChainId
   * @param {string} params.requestStakeHash
   * @param {string} params.facilitator
   *
   * @augments StakeAndMintBase
   *
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
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateStakeAmount();

    await oThis._fetchStakerGatewayComposer();

    await oThis._fetchRequiredAddresses();

    await oThis._setOriginWeb3Instance();

    const response = await oThis._performAcceptStake();

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
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        taskResponseData: { err: JSON.stringify(response), secretString: oThis.secretString }
      })
    );
  }

  /**
   * Validate stake amount.
   *
   * @sets oThis.amountToStake
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateStakeAmount() {
    const oThis = this;
    if (!oThis.amountToStake) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_bt_asr_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToStake: 'Stake Amount is invalid: ' + oThis.amountToStake }
        })
      );
    }
    oThis.amountToStake = new BigNumber(oThis.amountToStake);

    return oThis.amountToStake;
  }

  /**
   * Fetch required addresses.
   *
   * @sets oThis.gatewayContract, oThis.coGatewayContract, oThis.brandedTokenContract, oThis.originWorker
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchRequiredAddresses() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
    oThis.brandedTokenContract = addressesResp.data[tokenAddressConstants.brandedTokenContract];
    oThis.originWorker = addressesResp.data[tokenAddressConstants.originWorkerAddressKind][0];
  }

  /**
   * Get hash lock.
   *
   * @sets oThis.secretString
   *
   * @return {Promise<void>}
   * @private
   */
  _getHashLock() {
    const oThis = this;

    const response = MosaicJs.Helpers.StakeHelper.createSecretHashLock();

    oThis.secretString = response.secret;

    return response.hashLock;
  }

  /**
   * Get BT stake helper.
   *
   * @param {object} web3Instance
   *
   * @sets oThis.btStakeHelper
   *
   * @return {null|module:lib/stakeAndMint/brandedToken/AcceptStakeRequest.Helpers.StakeHelper}
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
   * Get EIP 712 Signature of worker.
   *
   * @sets oThis.provider
   *
   * @return {Promise<void>}
   * @private
   */
  async _getEIP712SignedSignature() {
    const oThis = this;

    const workerAddress = oThis.originWorker,
      signerWeb3Instance = new SignerWeb3Provider(oThis.originShuffledProviders[0]),
      web3Instance = await signerWeb3Instance.getInstance();

    oThis.provider = oThis.originShuffledProviders[0];

    // Fetch Staker Branded Token nonce to sign.
    const stakerBtNonce = await oThis
      ._getBTStakeHelper(web3Instance)
      ._getStakeRequestRawTx(oThis.requestStakeHash, web3Instance);

    // Add worker key.
    const checkSumWorkerAddress = web3Instance.utils.toChecksumAddress(workerAddress);
    await signerWeb3Instance.addAddressKey(workerAddress);

    // Sign transaction.
    const stakeRequestTypedData = await oThis
      ._getBTStakeHelper()
      .getStakeRequestTypedData(oThis.amountToStake.toString(10), stakerBtNonce.nonce);

    logger.log('stakeRequestTypedData', stakeRequestTypedData);

    // 2. Generate EIP712 Signature.
    const workerAccountInstance = web3Instance.eth.accounts.wallet[checkSumWorkerAddress];
    const signature = await workerAccountInstance.signEIP712TypedData(stakeRequestTypedData);
    // Remove worker key from web3.
    signerWeb3Instance.removeAddressKey(workerAddress);

    return signature;
  }

  /**
   * Perform confirm stake intent on CoGateway.
   *
   * @return {Promise<void>}
   * @private
   */
  async _performAcceptStake() {
    const oThis = this;

    // Get EIP 712 signature from OST Worker.
    const signature = await oThis._getEIP712SignedSignature(),
      hashLock = oThis._getHashLock();

    const txObject = await oThis
        ._getBTStakeHelper()
        ._acceptStakeRequestRawTx(oThis.requestStakeHash, signature, oThis.facilitator, hashLock),
      data = txObject.encodeABI(),
      gasPrice = await oThis._fetchGasPrice(), // Origin gas price
      txOptions = {
        gasPrice: gasPrice,
        gas: contractConstants.acceptStakeSTGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.provider,
      oThis.facilitator,
      oThis.gatewayComposer,
      txOptions,
      data
    );
  }

  /**
   * Get origin chain gas price.
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchGasPrice() {
    const dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    return dynamicGasPriceResponse.data;
  }

  /**
   * Get submit transaction parameters.
   *
   * @return {object}
   */
  get _customSubmitTxParams() {
    const oThis = this;

    return {
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.acceptStakeKind
    };
  }
}

module.exports = AcceptStakeByWorker;
