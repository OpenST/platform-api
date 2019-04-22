/**
 * Module to get ERC20 balance.
 *
 * @module lib/getBalance/Erc20
 */

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

// Declare variables.
const BATCH_SIZE = 15;

/**
 * Class to get ERC20 balance.
 *
 * @class GetErc20Balance
 */
class GetErc20Balance {
  /**
   * Constructor to get ERC20 balance.
   *
   * @param {object} params
   * @param {number/string} params.originChainId
   * @param {array} params.addresses
   * @param {string} params.contractAddress
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.addresses = params.addresses;
    oThis.contractAddress = params.contractAddress;

    oThis.originWeb3 = null;
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
   * Fetch balances.
   *
   * @return {Promise<any[]>}
   * @private
   */
  async _fetchBalances() {
    const oThis = this;
    let promiseArray = [];

    const genericErc20TokenAbi = CoreAbis.genericErc20,
      genericErc20TokenContractObj = new oThis.originWeb3.eth.Contract(genericErc20TokenAbi, oThis.contractAddress);

    for (let index = 0; index < oThis.addresses.length; index++) {
      const address = oThis.addresses[index];

      promiseArray.push(
        genericErc20TokenContractObj.methods
          .balanceOf(address)
          .call({})
          .then(function(balance) {
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

module.exports = GetErc20Balance;
