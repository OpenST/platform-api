'use strict';

/**
 * This class file helps in fetching request hash from a mined request stake transaction
 *
 * @module lib/stakeAndMint/brandedToken/FetchStakeRequestHash
 */
const BrandedToken = require('@openst/brandedtoken.js'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

const btContractName = 'BrandedToken',
  gcContractName = 'GatewayComposer';

class FetchStakeRequestHash extends StakeAndMintBase {
  /**
   * @constructor
   *
   * @param params
   * @param params.transactionHash {String}
   * @param params.originChainId   {Number}
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.transactionHash = params.transactionHash;
    oThis.originChainId = params.originChainId;

    oThis.transactionReceipt = null;
  }

  /***
   * Async perform
   *
   * @private
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchTransactionReceipt();

    let inputData = oThis._decodeInputData(),
      response = oThis._getRequestHash();

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
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];

    let shuffledProviders = basicHelper.shuffleArray(oThis.originChainConfig.originGeth.readWrite.wsProviders);

    oThis.originWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * fetch transaction receipt
   *
   * @return {Promise<any>}
   * @private
   */
  async _fetchTransactionReceipt() {
    const oThis = this;

    let txData = await oThis.originWeb3.eth.getTransaction(oThis.transactionHash),
      txReceipt = await oThis.originWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    oThis.transactionReceipt = Object.assign({}, txData, txReceipt);

    if (basicHelper.isEmptyObject(oThis.transactionReceipt)) {
      logger.error('Unable to fetch transaction receipt from chain.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_snmm_bt_frh_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * get request hash
   *
   * @return {Promise<any>}
   * @private
   */
  _getRequestHash() {
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
            if (eventData.name == '_stakeRequestHash') {
              let requestHash = eventData.value;
              return responseHelper.successWithData({
                requestHash: requestHash
              });
            }
          }
        }
      }
    }

    logger.error('No event found for StakeRequested.');

    return responseHelper.error({
      internal_error_identifier: 'l_snmm_bt_frh_2',
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    });
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

    return inputData;
  }

  /**
   * This function fetches abi of gateway composer
   *
   * @private
   */
  _addABI(contractName) {
    const oThis = this;

    let abi = new BrandedToken.AbiBinProvider().getABI(contractName);

    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }
}

module.exports = FetchStakeRequestHash;
