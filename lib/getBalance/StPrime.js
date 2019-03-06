'use strict';

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

const BATCH_SIZE = 15;

class GetStPrimeBalance {
  /**
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.addresses = params.addresses;

    oThis.balances = {};
  }

  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fetchBalances();

    return oThis.balances;
  }

  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    let auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readOnly.wsProviders;

    let shuffledProviders = basicHelper.shuffleArray(auxWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  async _fetchBalances() {
    const oThis = this;
    let promiseArray = [];

    for (let i = 0; i < oThis.addresses.length; i++) {
      let address = oThis.addresses[i];

      promiseArray.push(
        oThis.auxWeb3.eth
          .getBalance(address)
          .then(function(balance) {
            oThis.balances[address] = balance;
          })
          .catch(function(err) {
            console.log('------------------err--', err);
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

module.exports = GetStPrimeBalance;
