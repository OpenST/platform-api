/**
 * Module to help perform stake.
 *
 * @module lib/stakeAndMint/stPrime/Stake
 */

const BigNumber = require('bignumber.js'),
  MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to help perform stake.
 *
 * @class Stake
 */
class Stake extends StakeAndMintBase {
  /**
   * Constructor to help perform stake.
   *
   * @param {object} params
   * @param {number} params.originChainId
   * @param {number} params.auxChainId
   * @param {string} params.stakerAddress
   * @param {string} params.amountToStake
   * @param {string} params.beneficiary
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.stakerAddress = params.stakerAddress;
    oThis.amountToStake = params.amountToStake;
    oThis.beneficiary = params.beneficiary;

    oThis.secretString = null;
    oThis.stakerNonce = null;
    oThis.hashLock = null;
    oThis.gatewayContract = null;
    oThis.mosaicStakeHelper = null;
    oThis.shuffledProviders = null;
    oThis.originWeb3 = null;
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchGatewayAddress();

    oThis._validateStakerAddress();

    oThis._validateStakeAmount();

    await oThis._getStakerNonceFromGateway();

    await oThis._getHashLock();

    const response = await oThis._performStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: {
            transactionHash: response.data.transactionHash,
            secretString: oThis.secretString,
            chainId: oThis.originChainId,
            stakerNonce: oThis.stakerNonce
          }
        })
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        taskResponseData: {
          err: JSON.stringify(response),
          secretString: oThis.secretString,
          chainId: oThis.originChainId,
          stakerNonce: oThis.stakerNonce
        }
      })
    );
  }

  /**
   * Set origin web3 instance.
   *
   * @sets oThis.shuffledProviders, oThis.originWeb3
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.originChainId]);

    const originChainConfig = response[oThis.originChainId];
    const originWsProviders = originChainConfig.originGeth.readWrite.wsProviders;

    oThis.shuffledProviders = basicHelper.shuffleArray(originWsProviders);
    oThis.originWeb3 = web3Provider.getInstance(oThis.shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Fetch gateway address.
   *
   * @sets oThis.gatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddress() {
    const oThis = this;

    // Fetch gateway contract address
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
  }

  /**
   * Validate staker address.
   *
   * @return {Promise<void>}
   * @private
   */
  _validateStakerAddress() {
    const oThis = this;

    if (!oThis.stakerAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_sp_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stakerAddress: oThis.stakerAddress }
        })
      );
    }
  }

  /**
   * Validate stake amount.
   *
   * @sets oThis.amountToStake
   *
   * @return {Promise<void>}
   * @private
   */
  _validateStakeAmount() {
    const oThis = this;

    if (!oThis.amountToStake) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_sp_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToStake: 'Stake Amount is invalid' + oThis.amountToStake }
        })
      );
    }

    oThis.amountToStake = new BigNumber(oThis.amountToStake);
  }

  /**
   * Get staker helper object.
   *
   * @sets oThis.mosaicStakeHelper
   *
   * @return {null|module:lib/stakeAndMint/stPrime/Stake.Helpers.StakeHelper}
   * @private
   */
  get _stakeHelperObject() {
    const oThis = this;

    if (!oThis.mosaicStakeHelper) {
      oThis.mosaicStakeHelper = new MosaicJs.Helpers.StakeHelper();
    }

    return oThis.mosaicStakeHelper;
  }

  /**
   * Get staker nonce from gateway.
   *
   * @sets oThis.stakerNonce
   *
   * @return {Promise<void>}
   * @private
   */
  async _getStakerNonceFromGateway() {
    const oThis = this;

    oThis.stakerNonce = await oThis._stakeHelperObject.getNonce(
      oThis.stakerAddress,
      oThis.originWeb3,
      oThis.gatewayContract
    );
  }

  /**
   * Get hash lock.
   *
   * @sets oThis.secretString, oThis.hashLock
   *
   * @return {Promise<void>}
   * @private
   */
  async _getHashLock() {
    const oThis = this;

    const response = MosaicJs.Helpers.StakeHelper.createSecretHashLock();

    oThis.secretString = response.secret;
    oThis.hashLock = response.hashLock;
  }

  /**
   * Invoke stake.
   *
   * @return {Promise<void>}
   * @private
   */
  async _performStake() {
    const oThis = this;

    // These Gas prices would be used for Rewards after MVP.
    const gasPrice = '0',
      gasLimit = '0',
      txObject = oThis._stakeHelperObject._stakeRawTx(
        oThis.amountToStake.toString(10),
        oThis.beneficiary,
        gasPrice,
        gasLimit,
        oThis.stakerNonce,
        oThis.hashLock,
        {},
        oThis.originWeb3,
        oThis.gatewayContract,
        oThis.stakerAddress
      );

    const originGasPrice = await oThis._fetchGasPrice(),
      data = txObject.encodeABI(),
      txOptions = {
        gasPrice: originGasPrice,
        gas: contractConstants.stakeSTGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.shuffledProviders[0],
      oThis.stakerAddress,
      oThis.gatewayContract,
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
    return {
      pendingTransactionKind: pendingTransactionConstants.simpleTokenStakeKind
    };
  }
}

module.exports = Stake;
