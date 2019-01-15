'use strict';

/*
 *
 *  @module lib/stakeMintManagement/FetchTxEvents
 */

const MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class FetchTxEvents {
  constructor(params) {
    const oThis = this;

    oThis.web3Instance = params.web3Instance;
    oThis.transactionHash = params.transactionHash;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_smm_fte_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    // If contract addresses are not found
    if (!oThis.transactionHash) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_fte_2',
          api_error_identifier: 'contract_not_found',
          debug_options: {}
        })
      );
    }

    let resp = await oThis._getMessageHashFromReceipt(oThis.transactionHash);
    if (resp.isSuccess()) {
      return Promise.resolve(responseHelper.successWithData(resp.data));
    } else {
      return Promise.resolve(responseHelper.successWithData(resp.toJSON()));
    }
  }

  /**
   * @param txHash - transactionHash
   *
   * @return {Promise<any>}
   * @private
   */
  async _getMessageHashFromReceipt(txHash) {
    const oThis = this;

    oThis._addABI();

    let txReceipt = await oThis.web3Instance.eth.getTransactionReceipt(txHash);

    if (!txReceipt) {
      logger.error('Unable to fetch transaction receipt from chain.');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_fte_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let decodedEvents = abiDecoder.decodeLogs(txReceipt.logs);

    for (let index = 0; index < decodedEvents.length; index++) {
      let event = decodedEvents[index];
      if (event !== undefined && event instanceof Object) {
        if (event.name === 'StakeIntentDeclared') {
          for (let i = 0; i < event.events.length; i++) {
            let eventData = event.events[i];
            logger.debug(eventData);
            if ((eventData.name = '_messageHash')) {
              let messageHash = eventData.value;
              return Promise.resolve(responseHelper.successWithData(messageHash));
            }
          }
        }
      }
    }
    logger.error('No event found for StakeIntentDeclared.');
    return Promise.resolve(
      responseHelper.error({
        internal_error_identifier: 'l_smm_fte_4',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      })
    );
  }

  /**
   * This function fetches abi for gateway contract and adds the abi to abiDecoder.
   *
   * @private
   */
  _addABI() {
    const oThis = this;

    let abi = oThis.MosaicBinProvider.getABI(oThis.getGatewayContractName);
    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }

  /**
   * This function fetches mosaic bin Provider
   *
   * @returns {Provider}
   */
  get MosaicBinProvider() {
    return new MosaicTbd.AbiBinProvider();
  }

  get getGatewayContractName() {
    return 'EIP20Gateway';
  }
}

module.exports = FetchTxEvents;
