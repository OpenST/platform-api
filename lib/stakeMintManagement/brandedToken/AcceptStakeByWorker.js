'use strict';
/**
 * Kyc worker would accept stake and assign further work to Facilitator
 *
 * @module lib/stakeMintManagement/brandedToken/AcceptStakeByWorker
 */
const BigNumber = require('bignumber.js'),
  BrandedToken = require('@openstfoundation/branded-token.js'),
  MosaicTbd = require('@openstfoundation/mosaic-tbd');

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

class AcceptStakeByWorker extends Base {
  /**
   * @param {Object} params
   * @param {Number} params.auxChainId: Aux chain Id.
   * @param {Number} params.originChainId: Origin chain Id.
   * @param {Number} params.tokenId: Branded Token Id.
   * @param {String} params.facilitator: Facilitator to help in signing the transaction.
   * @param {String} params.stakerAddress: Staker Address to confirm stake operation.
   * @param {String} params.amountToStake: Amount staked on Origin chain
   * @param {String} params.requestStakeHash: Request stake hash to fetch stake details.
   *
   * @augments Base
   *
   * @constructor
   */
  constructor(params) {
    super(params);
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

    console.log(oThis);

    let response = await oThis._performAcceptStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: {
            chainId: oThis.auxChainId,
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
   * Perform Confirm stake intent on CoGateway
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _performAcceptStake() {
    const oThis = this;

    // Add worker key to web3 for EIP 712 sign
    let workerAddress = oThis.originWorker[0],
      signerWeb3Instance = new SignerWeb3Provider(oThis.originWsProviders[0], workerAddress),
      workerWeb3Instance = await signerWeb3Instance.getInstance(),
      checkSumWorkerAddress = workerWeb3Instance.utils.toChecksumAddress(workerAddress);

    // console.log(workerWeb3Instance);
    let btStakeHelper = new BrandedToken.Helpers.StakeHelper(
        workerWeb3Instance,
        oThis.brandedTokenContract,
        oThis.gatewayComposer
      ),
      stakerBtNonce = await btStakeHelper._getStakeRequestRawTx(oThis.requestStakeHash, workerWeb3Instance),
      hashLock = oThis._getHashLock();

    let txObject = await btStakeHelper._acceptStakeRequestRawTx(
        oThis.requestStakeHash,
        oThis.amountToStake.toString(10),
        stakerBtNonce.nonce,
        oThis.facilitator,
        checkSumWorkerAddress,
        hashLock,
        workerWeb3Instance
      ),
      data = txObject.encodeABI();

    // Remove worker key from web 3
    signerWeb3Instance.removeAddressKey(workerAddress);

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
