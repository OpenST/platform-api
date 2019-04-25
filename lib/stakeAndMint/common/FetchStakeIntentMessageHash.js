/**
 * Module to fetch stake intent message hash.
 *
 * @module lib/stakeAndMint/common/FetchStakeIntentMessageHash
 */

const MosaicJs = require('@openst/mosaic.js'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to fetch stake intent message hash.
 *
 * @class FetchStakeIntentMessageHash
 */
class FetchStakeIntentMessageHash {
  /**
   * Constructor to fetch stake intent message hash.
   *
   * @param {object} params
   * @param {number} params.originChainId
   * @param {string} params.transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.transactionHash = params.transactionHash;

    oThis.web3Instance = null;
    oThis.txReceipt = null;
    oThis.stakeIntentDeclaredEventDetails = {};
  }

  /**
   * Main performer for class.
   *
   * @return {Promise|*|Promise<T>}
   */
  async perform() {
    const oThis = this;

    const r = oThis._validateAndSanitize();
    if (r.isFailure()) {
      return Promise.reject(r);
    }

    await oThis._setOriginWeb3Instance();

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
   * Validate and sanitize
   *
   * @return {*}
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    // If transaction hash is unavailable.
    if (!oThis.transactionHash) {
      return responseHelper.error({
        internal_error_identifier: 'l_smm_fsimh_2',
        api_error_identifier: 'invalid_transaction_hash',
        debug_options: {}
      });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Set origin web3 instance.
   *
   * @sets oThis.web3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.originChainId]);

    const originChainConfig = response[oThis.originChainId];
    const originWsProviders = originChainConfig.originGeth.readOnly.wsProviders;
    const shuffledProviders = basicHelper.shuffleArray(originWsProviders);

    oThis.web3Instance = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Get tx receipt.
   *
   * @sets oThis.txReceipt
   *
   * @return {Promise<never>}
   * @private
   */
  async _getTxReceipt() {
    const oThis = this;

    oThis.txReceipt = await oThis.web3Instance.eth.getTransactionReceipt(oThis.transactionHash);

    if (!oThis.txReceipt) {
      logger.error('Unable to fetch transaction receipt from chain.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_fsimh_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * This function fetches abi for gateway contract and adds the abi to abiDecoder.
   *
   * @private
   */
  _addABI() {
    const oThis = this;

    const abi = new MosaicJs.AbiBinProvider().getABI('EIP20Gateway');
    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }

  /**
   * Get message hash from receipt.
   *
   * @return {Promise<*>}
   * @private
   */
  async _getMessageHashFromReceipt() {
    const oThis = this;

    const decodedEvents = abiDecoder.decodeLogs(oThis.txReceipt.logs);

    for (let decodedEventsIndex = 0; decodedEventsIndex < decodedEvents.length; decodedEventsIndex++) {
      const event = decodedEvents[decodedEventsIndex];
      if (event !== undefined && event instanceof Object) {
        if (event.name === 'StakeIntentDeclared') {
          logger.debug(event);
          oThis.stakeIntentDeclaredEventDetails = {
            blockNumber: oThis.txReceipt.blockNumber,
            transactionHash: oThis.transactionHash
          };

          for (let eventsIndex = 0; eventsIndex < event.events.length; eventsIndex++) {
            const eventData = event.events[eventsIndex];
            if (eventData.name === '_messageHash') {
              oThis.stakeIntentDeclaredEventDetails.messageHash = eventData.value;
            }
            if (eventData.name === '_amount') {
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
          internal_error_identifier: 'l_smm_fsimh_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }
}

module.exports = FetchStakeIntentMessageHash;
