/**
 * Module to get UBT balance.
 *
 * @module lib/getBalance/Ubt
 */

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to get UBT balance.
 *
 * @class GetUbtBalance
 */
class GetUbtBalance {
  /**
   * Constructor to get UBT balance.
   *
   * @param {object} params
   * @param {number/string} params.auxChainId
   * @param {number/string} params.tokenId
   * @param {array} params.addresses
   *
   * @constructor
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
   * Perform.
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
   * Set web3 instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    const shuffledProviders = basicHelper.shuffleArray(auxWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Set UBT Contract Address.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setUbtContractAddress() {
    const oThis = this;

    const getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.ubtContractAddress = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];
  }

  /**
   * Fetch balances.
   *
   * @return {Promise<any[]>}
   *
   * @private
   */
  _fetchBalances() {
    const oThis = this,
      promiseArray = [];

    const ubtAbi = CoreAbis.getAbi(contractNameConstants.utilityBrandedTokenContractName),
      ubtContractObj = new oThis.auxWeb3.eth.Contract(ubtAbi, oThis.ubtContractAddress);

    for (let index = 0; index < oThis.addresses.length; index++) {
      const address = oThis.addresses[index];

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
