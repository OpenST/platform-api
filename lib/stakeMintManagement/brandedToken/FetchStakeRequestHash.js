'use strict';

/*
 * This class file helps in fetching request hash from a mined request stake transaction
 */

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const BrandedToken = require('@openstfoundation/brandedtoken.js'),
  abiDecoder = require('abi-decoder');

const btContractName = 'BrandedToken',
  gcContractName = 'GatewayComposer';

class FetchStakeRequestHash extends Base {
  /**
   * @constructor
   *
   * @param params
   * @param params.transactionHash {String}
   * @param params.originChainId   {Number}
   */
  constructor(params) {
    super(params);
  }

  /***
   * Async performer for the class.
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchTransactionReceipt();

    let inputData = await oThis._decodeInputData(),
      response = await oThis._getRequestHash();

    Object.assign(inputData, { chainId: oThis.originChainId, requestStakeHash: response.data.requestHash });
    if (response.isSuccess()) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: inputData
      });
    } else {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed });
    }
  }

  /**
   * _fetchTransactionReceipt
   *
   * @return {Promise<any>}
   * @private
   */
  async _fetchTransactionReceipt() {
    const oThis = this;

    let txData = await oThis.originWeb3.eth.getTransaction(oThis.transactionHash),
      txReceipt = await oThis.originWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    oThis.transactionReceipt = {};
    Object.assign(oThis.transactionReceipt, txData, txReceipt);

    if (Object.keys(oThis.transactionReceipt).length <= 0) {
      logger.error('Unable to fetch transaction receipt from chain.');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_snmm_bt_frh_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * _getRequestHash
   *
   * @return {Promise<any>}
   * @private
   */
  async _getRequestHash() {
    const oThis = this;

    oThis._addABI(btContractName);

    let decodedEvents = abiDecoder.decodeLogs(oThis.transactionReceipt.logs);

    for (let index = 0; index < decodedEvents.length; index++) {
      let event = decodedEvents[index];
      if (event !== undefined && event instanceof Object) {
        if (event.name === 'StakeRequested') {
          for (let i = 0; i < event.events.length; i++) {
            let eventData = event.events[i];
            logger.debug(eventData);
            if ((eventData.name = '_stakeRequestHash')) {
              let requestHash = eventData.value;
              return Promise.resolve(
                responseHelper.successWithData({
                  requestHash: requestHash
                })
              );
            }
          }
        }
      }
    }

    logger.error('No event found for StakeRequested.');
    return Promise.resolve(
      responseHelper.error({
        internal_error_identifier: 'l_snmm_bt_frh_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      })
    );
  }

  /**
   * Decode input data
   *
   * @private
   */
  _decodeInputData() {
    const oThis = this;

    oThis._addABI(gcContractName);

    let decodedInput = abiDecoder.decodeMethod(oThis.transactionReceipt.input),
      inputParams = decodedInput.params,
      inputData = {};

    for (let i = 0; i < inputParams.length; i++) {
      let ip = inputParams[i];
      switch (ip.name.toLowerCase()) {
        case '_stakevt':
          inputData['amountToStake'] = ip.value;
          break;
        case '_beneficiary':
          inputData['beneficiary'] = ip.value;
          break;
        case '_nonce':
          inputData['stakerNonce'] = ip.value;
          break;
      }
    }

    return Promise.resolve(inputData);
  }

  /**
   * This function fetches abi of gateway composer
   *
   * @private
   */
  _addABI(contractName) {
    const oThis = this;

    let abi = oThis.BrandedTokenBinProvider.getABI(contractName);

    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }

  /**
   * This function fetches branded token bin Provider
   *
   * @returns {Provider}
   */
  get BrandedTokenBinProvider() {
    return new BrandedToken.AbiBinProvider();
  }
}

module.exports = FetchStakeRequestHash;
