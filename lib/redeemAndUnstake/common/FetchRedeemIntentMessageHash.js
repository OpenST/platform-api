/**
 * Module to fetch redeem intent message hash.
 *
 * @module lib/redeemAndUnstake/common/FetchRedeemIntentMessageHash
 */

const abiDecoder = require('abi-decoder');

const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName');

/**
 * Class to fetch redeem intent message hash.
 *
 * @class FetchRedeemIntentMessageHash
 */
class FetchRedeemIntentMessageHash {
  /**
   * Constructor to fetch redeem intent message hash.
   *
   * @param {object} params
   * @param {number} params.auxChainId
   * @param {string} params.transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.transactionHash = params.transactionHash;

    oThis.txReceipt = null;
    oThis.auxWeb3 = null;
    oThis.redeemIntentDeclaredEventDetails = {};
  }

  /**
   * Main performer of class.
   *
   * @return {Promise|*|Promise<T>}
   */
  async perform() {
    const oThis = this;

    const response = oThis._validateAndSanitize();
    if (response.isFailure()) {
      return Promise.reject(response);
    }

    await oThis._setAuxWeb3Instance();

    await oThis._getTxReceipt();

    oThis._addABI();

    await oThis._getMessageHashFromReceipt();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      taskResponseData: oThis.redeemIntentDeclaredEventDetails
    });
  }

  /**
   * Validate and sanitize.
   *
   * @return {*}
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    // If contract addresses are not found.
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
   * Set aux web3 instance.
   *
   * @sets oThis.auxWeb3
   *
   * @return {Promise<void>}
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.auxWeb3 = web3Provider.getInstance(auxWsProviders[0]).web3WsProvider;
  }

  /**
   * Get transaction receipt.
   *
   * @sets oThis.txReceipt
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
    const abi = CoreAbis.getAbi(contractNameConstants.eip20CoGatewayContractName);
    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }

  /**
   * Get message hash from receipt.
   *
   * @sets oThis.redeemIntentDeclaredEventDetails
   *
   * @return {Promise<*>}
   * @private
   */
  async _getMessageHashFromReceipt() {
    const oThis = this;

    logger.log('Transaction Receipt:', oThis.txReceipt);

    const decodedEvents = abiDecoder.decodeLogs(oThis.txReceipt.logs);
    logger.log('Decoded events: ', decodedEvents);

    for (let decodedEventsIndex = 0; decodedEventsIndex < decodedEvents.length; decodedEventsIndex++) {
      const event = decodedEvents[decodedEventsIndex];
      if (event !== undefined && event instanceof Object) {
        if (event.name === 'RedeemIntentDeclared') {
          logger.debug(event);
          oThis.redeemIntentDeclaredEventDetails = {
            blockNumber: oThis.txReceipt.blockNumber,
            transactionHash: oThis.transactionHash,
            messageHash: '',
            amountRedeemed: ''
          };

          for (let eventsIndex = 0; eventsIndex < event.events.length; eventsIndex++) {
            const eventData = event.events[eventsIndex];
            if (eventData.name === '_messageHash') {
              oThis.redeemIntentDeclaredEventDetails.messageHash = eventData.value;
            }
            if (eventData.name === '_amount') {
              oThis.redeemIntentDeclaredEventDetails.amountRedeemed = eventData.value;
            }
          }
        }
      }
    }

    if (basicHelper.isEmptyObject(oThis.redeemIntentDeclaredEventDetails)) {
      logger.error('No event found for RedeemIntentDeclared.');

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
