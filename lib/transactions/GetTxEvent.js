'use strict';
/**
 * This class returns the events map from event name and transaction hash passed.
 *
 *
 * NOTE:- final result will be a hash with event name as key and value = array of events
 *
 *
 * @module lib/transactions/GetTxEvent
 */

const abiDecoder = require('abi-decoder'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object');

/**
 * Class for getting tx event.
 *
 * @class GetTxEvent
 */
class GetTxEvent {
  /**
   *
   * @param {Object} params
   * @param params.transactionHash {String} - transactionHash for which receipt is fetched
   * @param params.contractNames {Array} - contractNames, e.g - ['ProxyFactory', 'UserWalletFactory', 'TokenRules']
   * @param params.eventNamesMap {Object} - eventNamesMap, e.g - {'ProxyCreated': '1', 'StakeRequested': '1', 'UserWalletCreated': '1'}
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
    oThis.contractNames = params.contractNames;
    oThis.eventNamesMap = params.eventNamesMap;

    oThis.finalEventsData = {};
  }

  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fetchTransactionReceipt();

    await oThis._getEventsData();

    return Promise.resolve(responseHelper.successWithData(oThis.finalEventsData));
  }

  /**
   * Set web3 instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.chainId, 'readWrite');
    oThis.web3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
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

    oThis.transactionReceipt = await oThis.web3Instance.eth.getTransactionReceipt(oThis.transactionHash);

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

    for (let i = 0; i < oThis.contractNames.length; i++) {
      oThis._addABI(oThis.contractNames[i]);
    }

    const decodedEvents = abiDecoder.decodeLogs(oThis.transactionReceipt.logs);

    for (let index = 0; index < decodedEvents.length; index++) {
      let event = decodedEvents[index];

      if (event !== undefined && event instanceof Object) {
        if (oThis.eventNamesMap.hasOwnProperty(event.name)) {
          oThis.finalEventsData[event.name] = event.events;
        }
      }
    }
  }

  /**
   * This function fetches abi of contract.
   *
   * @private
   */
  _addABI(contractName) {
    const oThis = this;

    let abi = [];

    try {
      abi = CoreAbis[contractName];
    } catch (err) {
      throw `Unknown contract ${contractName}`;
    }

    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(GetTxEvent, coreConstants.icNameSpace, 'GetTxEvent');

module.exports = {};
