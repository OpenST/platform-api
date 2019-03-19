'use strict';

const MosaicJs = require('@openstfoundation/mosaic.js'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic');

class FetchRedeemIntentMessageHash extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.transactionHash = params.transactionHash;

    oThis.txReceipt = null;
    oThis.stakeIntentDeclaredEventDetails = {};
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  async perform() {
    const oThis = this;

    let r = oThis._validateAndSanitize();
    if (r.isFailure()) return Promise.reject(r);

    await oThis._setAuxWeb3Instance();

    await oThis._getTxReceipt();

    oThis._addABI();

    await oThis._getMessageHashFromReceipt();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      taskResponseData: oThis.stakeIntentDeclaredEventDetails,
      feResponseData: { amountMinted: oThis.stakeIntentDeclaredEventDetails.amountMinted }
    });
  }

  /**
   * validate and sanitize
   *
   * @return {*}
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    // If contract addresses are not found
    if (!oThis.transactionHash) {
      return responseHelper.error({
        internal_error_identifier: 'l_rau_frimh_1',
        api_error_identifier: 'invalid_transaction_hash',
        debug_options: {}
      });
    }
    return responseHelper.successWithData({});
  }

  /**
   * get tx receipt
   *
   * @return {Promise<never>}
   * @private
   */
  async _getTxReceipt() {
    const oThis = this;

    oThis.txReceipt = await oThis.auxWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    if (!oThis.txReceipt) {
      logger.error('Unable to fetch transaction receipt from chain.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_rau_frimh_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * This function fetches abi for coGateway contract and adds the abi to abiDecoder.
   *
   * @private
   */
  _addABI() {
    const oThis = this;

    let abi = new MosaicJs.AbiBinProvider().getABI(contractNameConstants.eip20CoGatewayContractName);
    console.log('Abi:', abi);
    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }

  /**
   * get message hash from receipt
   *
   * @return {Promise<*>}
   * @private
   */
  async _getMessageHashFromReceipt() {
    const oThis = this;

    console.log('Transaction Receipt:', oThis.txReceipt);

    let decodedEvents = abiDecoder.decodeLogs(oThis.txReceipt.logs);
    console.log('Decoded events: ', decodedEvents);

    for (let decodedEventsIndex = 0; decodedEventsIndex < decodedEvents.length; decodedEventsIndex++) {
      let event = decodedEvents[decodedEventsIndex];
      if (event !== undefined && event instanceof Object) {
        if (event.name === 'StakeIntentDeclared') {
          logger.debug(event);
          oThis.stakeIntentDeclaredEventDetails = {
            blockNumber: oThis.txReceipt.blockNumber,
            transactionHash: oThis.transactionHash
          };

          for (let eventsIndex = 0; eventsIndex < event.events.length; eventsIndex++) {
            let eventData = event.events[eventsIndex];
            if (eventData.name == '_messageHash') {
              oThis.stakeIntentDeclaredEventDetails.messageHash = eventData.value;
            }
            if (eventData.name == '_amount') {
              oThis.stakeIntentDeclaredEventDetails.amountMinted = eventData.value;
            }
          }
        }
      }
    }

    if (basicHelper.isEmptyObject(oThis.stakeIntentDeclaredEventDetails)) {
      logger.error('No event found for StakeIntentDeclared.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_rau_frimh_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }
}

module.exports = FetchRedeemIntentMessageHash;
