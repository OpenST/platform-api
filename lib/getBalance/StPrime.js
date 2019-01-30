'use strict';

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

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

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readOnly.wsProviders;

    oThis.auxWeb3 = web3Provider.getInstance(auxWsProviders[0]).web3WsProvider;
  }

  async _fetchBalances() {
    const oThis = this,
      promiseArray = [];

    for (let i = 0; i < oThis.addresses.length; i++) {
      let address = oThis.addresses[i];

      promiseArray.push(
        oThis.auxWeb3.eth.getBalance(address).then(function(balance) {
          oThis.balances[address] = balance;
        })
      );
    }

    await Promise.all(promiseArray);

    return;
  }
}

module.exports = GetStPrimeBalance;
