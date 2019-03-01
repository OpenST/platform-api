'use strict';

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class GetOstBalance {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.originChainId = params.originChainId;
    oThis.addresses = params.addresses;

    oThis.originWeb3 = null;
    oThis.simpleTokenContractAddress = null;

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

    await oThis._setSimpleTokenContractAddress();

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
   * Fetch balances
   *
   * @return {Promise<any[]>}
   *
   * @private
   */
  _fetchBalances() {
    const oThis = this,
      promiseArray = [];

    let simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new oThis.originWeb3.eth.Contract(simpleTokenAbi, oThis.simpleTokenContractAddress);

    for (let i = 0; i < oThis.addresses.length; i++) {
      let address = oThis.addresses[i];

      promiseArray.push(
        simpleTokenContractObj.methods
          .balanceOf(address)
          .call({})
          .then(function(balance) {
            oThis.balances[address] = balance;
          })
      );
    }

    return Promise.all(promiseArray);
  }

  /**
   * Set Simple Token Contract Address
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setSimpleTokenContractAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_gb_o_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.simpleTokenContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
  }
}

module.exports = GetOstBalance;
