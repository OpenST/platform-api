/**
 * Module to get Eth balance.
 *
 * @module lib/getBalance/Eth
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

// Declare variables.
const BATCH_SIZE = 15;

/**
 * Class to get Eth balance.
 *
 * @class GetEthBalance
 */
class GetEthBalance {
  /**
   * Constructor to get OST balance.
   *
   * @param {object} params
   * @param {number/string} params.originChainId
   * @param {array} params.addresses
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.addresses = params.addresses;

    oThis.balances = {};
  }

  /**
   * Perform.
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fetchBalances();

    return oThis.balances;
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

    const response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId],
      originWsProviders = originChainConfig.originGeth.readWrite.wsProviders;

    const shuffledProviders = basicHelper.shuffleArray(originWsProviders);

    oThis.originWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Fetch balance of mentioned addresses.
   *
   * @return {Promise<any[]>}
   *
   * @private
   */
  async _fetchBalances() {
    const oThis = this;
    let promiseArray = [];

    for (let index = 0; index < oThis.addresses.length; index++) {
      const address = oThis.addresses[index];

      promiseArray.push(
        oThis.originWeb3.eth.getBalance(address).then(function(balance) {
          oThis.balances[address] = balance;
        })
      );

      if (promiseArray.length >= BATCH_SIZE || oThis.addresses.length === index + 1) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }

    return Promise.all(promiseArray);
  }
}

module.exports = GetEthBalance;
