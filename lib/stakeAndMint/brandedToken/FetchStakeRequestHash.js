/**
 * Module to fetch stake request hash from a mined request stake transaction.
 *
 * @module lib/stakeAndMint/brandedToken/FetchStakeRequestHash
 */

const BrandedToken = require('@openst/brandedtoken.js'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// Declare variables.
const btContractName = 'BrandedToken',
  gcContractName = 'GatewayComposer';

/**
 * Class to fetch stake request hash from a mined request stake transaction.
 *
 * @class FetchStakeRequestHash
 */
class FetchStakeRequestHash extends StakeAndMintBase {
  /**
   * Constructor to fetch stake request hash from a mined request stake transaction.
   *
   * @param {object} params
   * @param {string} params.transactionHash
   * @param {number} params.originChainId
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.transactionHash = params.transactionHash;
    oThis.originChainId = params.originChainId;

    oThis.transactionReceipt = null;
  }

  /**
   * Async perform.
   *
   * @return {Promise<result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchTransactionReceipt();

    const inputData = oThis._decodeInputData(),
      response = oThis._getRequestHash();

    Object.assign(inputData, { chainId: oThis.originChainId, requestStakeHash: response.data.requestHash });

    if (response.isSuccess()) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: inputData
      });
    }

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed });
  }

  /**
   * Fetch transaction receipt.
   *
   * @return {Promise<any>}
   * @private
   */
  async _fetchTransactionReceipt() {
    const oThis = this;

    const txData = await oThis.originWeb3.eth.getTransaction(oThis.transactionHash),
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
   * Get request hash.
   *
   * @return {Promise<any>}
   * @private
   */
  _getRequestHash() {
    const oThis = this;

    oThis._addABI(btContractName);

    const decodedEvents = abiDecoder.decodeLogs(oThis.transactionReceipt.logs);

    for (let index = 0; index < decodedEvents.length; index++) {
      const event = decodedEvents[index];
      if (event !== undefined && event instanceof Object) {
        if (event.name === 'StakeRequested') {
          for (let eventIndex = 0; eventIndex < event.events.length; eventIndex++) {
            const eventData = event.events[eventIndex];
            logger.debug(eventData);
            if (eventData.name === '_stakeRequestHash') {
              const requestHash = eventData.value;

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
   * Decode input data.
   *
   * @private
   */
  _decodeInputData() {
    const oThis = this;

    oThis._addABI(gcContractName);

    const decodedInput = abiDecoder.decodeMethod(oThis.transactionReceipt.input),
      inputParams = decodedInput.params,
      inputData = {};

    for (let index = 0; index < inputParams.length; index++) {
      const ip = inputParams[index];
      switch (ip.name.toLowerCase()) {
        case '_stakevt':
          inputData.amountToStake = ip.value;
          break;
        case '_beneficiary':
          inputData.beneficiary = ip.value;
          break;
        case '_nonce':
          inputData.stakerNonce = ip.value;
          break;
      }
    }

    return inputData;
  }

  /**
   * This function fetches abi of gateway composer.
   *
   * @private
   */
  _addABI(contractName) {
    const abi = new BrandedToken.AbiBinProvider().getABI(contractName);

    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }
}

module.exports = FetchStakeRequestHash;
