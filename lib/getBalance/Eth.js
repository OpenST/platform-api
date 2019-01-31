'use strict';

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

class GetEthBalance {
  /**
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.originChainId = params.originChainId;
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

    let response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId],
      originWsProviders = originChainConfig.originGeth.readOnly.wsProviders;

    oThis.originWeb3 = web3Provider.getInstance(originWsProviders[0]).web3WsProvider;
  }

  _fetchBalances() {
    const oThis = this,
      promiseArray = [];

    for (let i = 0; i < oThis.addresses.length; i++) {
      let address = oThis.addresses[i];

      promiseArray.push(
        oThis.originWeb3.eth.getBalance(address).then(function(balance) {
          oThis.balances[address] = balance;
        })
      );
    }

    return Promise.all(promiseArray);
  }
}

module.exports = GetEthBalance;
