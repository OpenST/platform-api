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
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3');

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
    oThis.brandedTokenContract = params.brandedTokenContract;
    oThis.requestStakeHash = params.requestStakeHash;
    oThis.facilitator = params.facilitator;

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

    await oThis._fetchContractAddresses();

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
   * _tokenAddressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _tokenAddressKindsToFetch() {
    const oThis = this;

    let addrKinds = {};
    addrKinds[tokenAddressConstants.tokenGatewayContract] = chainAddressConstants.originGatewayContractKind;
    addrKinds[tokenAddressConstants.tokenCoGatewayContract] = chainAddressConstants.auxCoGatewayContractKind;
    addrKinds[tokenAddressConstants.brandedTokenContract] = tokenAddressConstants.brandedTokenContract;
    addrKinds[tokenAddressConstants.originWorkerAddressKind] = tokenAddressConstants.originWorkerAddressKind;

    return addrKinds;
  }

  /**
   * Validate stake amount
   *
   * @return {Promise<void>}
   *
   * @private
   */
  _validateStakeAmount() {
    const oThis = this;

    oThis.amountToStake = new BigNumber(oThis.amountToStake);
    if (!oThis.amountToStake) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToStake: 'Stake Amount is invalid' + oThis.amountToStake }
        })
      );
    }
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

    let workerAddress = oThis.originWorker[0],
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

    console.log('stakeRequestTypedData', stakeRequestTypedData);

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
      data = txObject.encodeABI();

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.facilitator,
      oThis.gatewayComposer,
      data
    );
  }
}

module.exports = AcceptStakeByWorker;
