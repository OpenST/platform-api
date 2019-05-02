'use strict';

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

class GetBtBalance {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.tokenId = params.tokenId;
    oThis.addresses = params.addresses;

    oThis.originWeb3 = null;
    oThis.btContractAddress = null;

    oThis.balances = {};
  }

  /**
   * Perform
   *
   * @return {Promise<{}>}
   */
  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._setUbtContractAddress();

    await oThis._fetchBalances();

    return oThis.balances;
  }

  /**
   * Set web3 instance
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId],
      originWsProviders = originChainConfig.originGeth.readOnly.wsProviders;

    let shuffledProviders = basicHelper.shuffleArray(originWsProviders);

    oThis.originWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Set UBT Contract Address
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setUbtContractAddress() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.btContractAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];
  }

  /**
   * Fetch balances
   *
   * @return {Promise<any[]>}
   *
   * @private
   */
  _fetchBalances() {
    const oThis = this,
      promiseArray = [];

    let btAbi = CoreAbis.getAbi(contractNameConstants.brandedTokenContractName),
      ubtContractObj = new oThis.originWeb3.eth.Contract(btAbi, oThis.btContractAddress);

    for (let i = 0; i < oThis.addresses.length; i++) {
      let address = oThis.addresses[i];

      promiseArray.push(
        ubtContractObj.methods
          .balanceOf(address)
          .call({})
          .then(function(balance) {
            oThis.balances[address] = balance;
          })
      );
    }

    return Promise.all(promiseArray);
  }
}

module.exports = GetBtBalance;
