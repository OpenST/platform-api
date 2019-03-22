const Crypto = require('crypto'),
  web3Utils = require('web3-utils'),
  BigNumber = require('bignumber.js'),
  Buffer = require('safe-buffer').Buffer;

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

class Base {
  constructor() {
    const oThis = this;
    // Pending tx payload
    oThis.payloadDetails = params.payloadDetails;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.redeemerAddress = params.redeemerAddress;
    oThis.amountToRedeem = params.amountToRedeem;
    oThis.beneficiary = params.beneficiary;

    oThis.originWeb3 = null;
    oThis.auxWeb3 = null;
    oThis.shuffledProviders = {};
    oThis.transactionData = null;
  }

  /**
   * Perform operation
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._validate();

    await oThis._setWeb3Instance();

    await oThis._fetchContractAddresses();

    await oThis._buildTransactionData();

    let response = await oThis._submitTransaction();

    let responseData = {
      transactionHash: response.data.transactionHash,
      chainId: oThis._getChainId()
    };

    // Merge response extra data if any
    Object.assign(responseData, oThis._mergeExtraResponseData());

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: responseData
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: responseData
        })
      );
    }
  }

  /**
   * Validate Data
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validate() {
    const oThis = this;

    if (!CommonValidator.validateEthAddress(oThis.redeemerAddress)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_rau_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { redeemerAddress: oThis.redeemerAddress }
        })
      );
    }

    if (!CommonValidator.validateEthAddress(oThis.beneficiary)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_rau_b_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { beneficiary: oThis.beneficiary }
        })
      );
    }

    if (!CommonValidator.validateNonZeroWeiValue(oThis.amountToRedeem)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_rau_b_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToRedeem: 'Redeem Amount is invalid' + oThis.amountToRedeem }
        })
      );
    }

    oThis.amountToRedeem = new BigNumber(oThis.amountToRedeem).toString(10);
  }

  /**
   * Set corresponding(origin or Aux) Web3 instance required.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    throw 'Sub-class to implement';
  }

  /**
   * _setOriginWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId],
      originWsProviders = originChainConfig.originGeth.readWrite.wsProviders;

    oThis.shuffledProviders[oThis.originChainId] = [];
    oThis.shuffledProviders[oThis.originChainId] = basicHelper.shuffleArray(originWsProviders);

    oThis.originWeb3 = web3Provider.getInstance(oThis.shuffledProviders[oThis.originChainId][0]).web3WsProvider;
  }

  /**
   * _setAuxWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.shuffledProviders[oThis.auxChainId] = [];
    oThis.shuffledProviders[oThis.auxChainId] = basicHelper.shuffleArray(auxWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(oThis.shuffledProviders[oThis.auxChainId][0]).web3WsProvider;
  }

  /**
   * Fetch corresponding Contract addresses required in operation.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    throw 'Sub-class to implement';
  }

  /**
   * Build transaction executable data
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    throw 'Sub-class to implement';
  }

  /**
   * Get chain Id to execute transaction on.
   *
   * @private
   */
  _getChainId() {
    throw 'Sub-class to implement';
  }

  /**
   * Submit transaction on corresponding chain.
   *
   * @returns {Promise<*>}
   * @private
   */
  _submitTransaction() {
    const oThis = this;

    const chainId = oThis._getChainId();

    const submitTransactionObj = new SubmitTransaction({
      chainId: chainId,
      txOptions: oThis.transactionData,
      provider: oThis.shuffledProviders[chainId][0],
      options: oThis.payloadDetails
    });

    return submitTransactionObj.perform();
  }

  /**
   * Merge extra response data if any
   *
   * @private
   */
  _mergeExtraResponseData() {
    throw 'Sub-class to implement';
  }

  /**
   * Get secret hash lock
   *
   * @param secretString
   * @returns {{secret: *, hashLock: *}}
   */
  getSecretHashLock(secretString) {
    if (!secretString) {
      secretString = Crypto.randomBytes(16).toString('hex');
    }
    let secretBytes = Buffer.from(secretString);
    return {
      secret: secretString,
      unlockSecret: '0x' + secretBytes.toString('hex'),
      hashLock: web3Utils.keccak256(secretString)
    };
  }
}

module.exports = Base;
