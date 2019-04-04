/**
 * Module to get StPrime balance.
 *
 * @module lib/getBalance/StPrime
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

// Declare variables.
const BATCH_SIZE = 15;

/**
 * Class to get StPrime balance.
 *
 * @class GetStPrimeBalance
 */
class GetStPrimeBalance {
  /**
   * Constructor to get StPrime balance.
   *
   * @param {object} params
   * @param {number/string} params.auxChainId
   * @param {array} params.addresses
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.addresses = params.addresses;

    oThis.balances = {};
  }

  /**
   * Perform.
   *
   * @return {Promise<{}>}
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

    const response = await chainConfigProvider.getFor([oThis.auxChainId]);

    const auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    const shuffledProviders = basicHelper.shuffleArray(auxWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Fetch balances.
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
        oThis.auxWeb3.eth
          .getBalance(address)
          .then(function(balance) {
            oThis.balances[address] = balance;
          })
          .catch(function(err) {
            logger.error(`Error: ${err}`);
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

module.exports = GetStPrimeBalance;
