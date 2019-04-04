'use strict';

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

class GetUbtBalance {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.tokenId = params.tokenId;
    oThis.addresses = params.addresses;

    oThis.auxWeb3 = null;
    oThis.ubtContractAddress = null;

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

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    let shuffledProviders = basicHelper.shuffleArray(auxWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
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

    oThis.ubtContractAddress = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];
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

    let ubtAbi = CoreAbis.getAbi(contractNameConstants.utilityBrandedTokenContractName),
      ubtContractObj = new oThis.auxWeb3.eth.Contract(ubtAbi, oThis.ubtContractAddress);

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

module.exports = GetUbtBalance;
