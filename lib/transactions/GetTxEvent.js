'use strict';
/**
 * This class returns the event from the transaction hash passed.
 *
 * @module lib/transactions/GetTxEvent.js
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

class GetTxEvent {
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
    oThis.contractName = params.contractName;
    oThis.eventName = params.eventName;

    oThis.eventData = null;
  }

  async perform() {
    const oThis = this;

    await oThis._setAuxWeb3Instance();

    await oThis._fetchTransactionReceipt();

    await oThis._getEventsData();

    return Promise.resolve(
      responseHelper.successWithData({
        eventData: oThis.eventData
      })
    );
  }

  /**
   * Set aux web3 instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.chainId]),
      auxChainConfig = response[oThis.chainId],
      auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.auxWeb3 = web3Provider.getInstance(auxWsProviders[0]).web3WsProvider;
  }

  /**
   * Fetch transaction receipt.
   *
   * @return {Promise<any>}
   *
   * @private
   */
  async _fetchTransactionReceipt() {
    const oThis = this;

    oThis.transactionReceipt = await oThis.auxWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    if (basicHelper.isEmptyObject(oThis.transactionReceipt)) {
      logger.error('Unable to fetch transaction receipt from chain.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_gte_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Get registered user details.
   *
   * @return {Promise<any>}
   *
   * @private
   */
  _getEventsData() {
    const oThis = this;

    oThis._addABI(oThis.contractName);

    let decodedEvents = abiDecoder.decodeLogs(oThis.transactionReceipt.logs);

    for (let index = 0; index < decodedEvents.length; index++) {
      let event = decodedEvents[index];
      if (event !== undefined && event instanceof Object) {
        if (event.name === oThis.eventName) {
          oThis.eventData = event;
          break;
        }
      }
    }

    if (!oThis.eventData) {
      logger.error('Event data not found for the given event name.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_gte_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * This function fetches abi of contract.
   *
   * @private
   */
  _addABI(contractName) {
    const oThis = this;

    let abi = CoreAbis[contractName];

    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }
}
