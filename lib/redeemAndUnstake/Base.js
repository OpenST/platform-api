const BigNumber = require('bignumber.js');

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

class Base {
  constructor(params) {
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

    let resp = await oThis._buildTransactionData().catch(async function(err) {
      logger.info('err: ', err);
      const retryFromId = await oThis._isRetryPossible();
      const respData = { err: err };
      if (retryFromId) {
        respData['retryFromId'] = retryFromId;
      }
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        retryFromId: retryFromId,
        taskResponseData: respData
      });
    });

    if (!oThis.transactionData) {
      return resp;
    }

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
   * Is Retry possible for particular step.
   *
   * @returns {Promise<number>}
   * @private
   */
  async _isRetryPossible() {
    return 0;
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
      options: oThis.payloadDetails,
      pendingTransactionKind: oThis._getPendingTransactionKind()
    });

    return submitTransactionObj.perform();
  }

  /**
   * Get Pending transaction kind of particular transaction
   *
   * @private
   */
  _getPendingTransactionKind() {
    throw 'Sub-class to implement';
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
   * Get origin chain dynamic gas price
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchOriginGasPrice() {
    const oThis = this;

    let dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    return dynamicGasPriceResponse.data;
  }
}

module.exports = Base;
