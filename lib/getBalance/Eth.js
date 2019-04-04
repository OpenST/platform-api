'use strict';

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

const BATCH_SIZE = 15;

class GetEthBalance {
  /**
   * Constructor to fetch eth balance
   *
   * @constructor
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.originChainId = params.originChainId;
    oThis.addresses = params.addresses;

    oThis.balances = {};
  }

  /**
   * Perform
   *
   * @returns {Promise<*>}
   */
  perform() {
    const oThis = this;
    return oThis.asyncPerform().catch(function(err) {
      logger.error(` In catch block of ${__filename}`);

      return responseHelper.error({
        internal_error_identifier: 'l_gb_e_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async perform
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fetchBalances();

    return oThis.balances;
  }

  /**
   * Set web3 instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId],
      originWsProviders = originChainConfig.originGeth.readWrite.wsProviders;

    let shuffledProviders = basicHelper.shuffleArray(originWsProviders);

    oThis.originWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Fetch balance of mentioned addresses
   *
   * @return {Promise<[any , any , any , any , any , any , any , any , any , any]>}
   * @private
   */
  async _fetchBalances() {
    const oThis = this;
    let promiseArray = [];

    for (let i = 0; i < oThis.addresses.length; i++) {
      let address = oThis.addresses[i];

      promiseArray.push(
        oThis.originWeb3.eth.getBalance(address).then(function(balance) {
          oThis.balances[address] = balance;
        })
      );

      if (promiseArray.length >= BATCH_SIZE || oThis.addresses.length === i + 1) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }

    return Promise.all(promiseArray);
  }
}

module.exports = GetEthBalance;
