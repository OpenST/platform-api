/**
 * Module to get OST balance.
 *
 * @module lib/getBalance/Ost
 */

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

// Declare variables.
const BATCH_SIZE = 15;

/**
 * Class to get OST balance.
 *
 * @class GetOstBalance
 */
class GetOstBalance {
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

    oThis.originWeb3 = null;
    oThis.simpleTokenContractAddress = null;

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

    await oThis._setSimpleTokenContractAddress();

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
   * Set Simple Token Contract Address.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setSimpleTokenContractAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
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

    const simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new oThis.originWeb3.eth.Contract(simpleTokenAbi, oThis.simpleTokenContractAddress);

    for (let index = 0; index < oThis.addresses.length; index++) {
      const address = oThis.addresses[index];

      promiseArray.push(
        simpleTokenContractObj.methods
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

module.exports = GetOstBalance;
