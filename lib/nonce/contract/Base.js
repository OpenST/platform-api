'use strict';

/**
 * Module to fetch nonce of an address from specific contract.
 *
 * @module lib/nonce/contract/Base
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Base class to fetch nonce of an address from specific contract
 *
 * @class
 */
class Base {
  /**
   * Constructor
   *
   * @param params {Object}
   * @param {Number} params.auxChainId - Aux chain Id
   * @param {Number} params.tokenId
   * @param {String} params.userId
   * @param {Object} [params.chainWsProviders] - chainWsProviders (Optional Parameter)
   * @param {Object} [params.chainRpcProviders] - chainRpcProviders (Optional Parameter)
   *
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
    oThis.auxChainId = params.auxChainId;
    oThis.chainWsProviders = params.chainWsProviders;
    oThis.chainRpcProviders = params.chainRpcProviders;

    oThis.userData = null;
    oThis.contractObj = null;
    oThis.web3Instance = null;
  }

  /**
   * Perform
   *
   * @returns {Promise<*|result>}
   */
  async perform() {
    const oThis = this;

    await oThis._setChainProviders();

    await oThis._fetchUserDetails();

    // sub-class specific implementation
    let nonce = await oThis._getNonce();

    return responseHelper.successWithData({ nonce: nonce });
  }
  /**
   * Fetches provider endpoints for given chain
   *
   * @return {Promise<never>}
   * @private
   */
  async _setChainProviders() {
    const oThis = this;

    if (!oThis.chainWsProviders || !oThis.chainRpcProviders) {
      let response = await chainConfigProvider.getFor([oThis.auxChainId]),
        auxChainConfig = response[oThis.auxChainId];

      oThis.chainWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;
      oThis.chainRpcProviders = auxChainConfig.auxGeth.readWrite.rpcProviders;
    }

    if (oThis.chainWsProviders.length === 0 && oThis.chainRpcProviders.length === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_n_c_b_1',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch user details for given user id.
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchUserDetails() {
    const oThis = this;

    let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_n_c_b_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {
            tokenId: oThis.tokenId,
            userId: oThis.userId
          }
        })
      );
    }

    oThis.userData = cacheFetchRsp.data[oThis.userId];
  }

  /**
   * Fetch max nonce
   *
   * Get nonce from from all providers and calculates max
   *
   * @param contractAbi
   * @param contractAddress
   * @return {Promise<never>}
   * @private
   */
  async _fetchMaxNonce(contractAbi, contractAddress) {
    const oThis = this,
      wsPromises = [],
      rpcPromises = [];

    let noncesFromAllGeth = [];

    for (let i = 0; i < oThis.chainWsProviders.length; i++) {
      let wsChainURL = oThis.chainWsProviders[i],
        rpcChainURL = oThis.chainRpcProviders[i];

      let web3WsProvider = web3Provider.getInstance(wsChainURL).web3WsProvider,
        web3RpcProvider = web3Provider.getInstance(rpcChainURL).web3WsProvider;

      wsPromises.push(oThis._createContractObjAndFetchNonce(web3WsProvider, contractAbi, contractAddress));
      rpcPromises.push(oThis._createContractObjAndFetchNonce(web3RpcProvider, contractAbi, contractAddress));
    }

    let cumulativePromiseResponses = await Promise.all([Promise.all(wsPromises), Promise.all(rpcPromises)]);

    noncesFromAllGeth = noncesFromAllGeth.concat(cumulativePromiseResponses[0]);
    noncesFromAllGeth = noncesFromAllGeth.concat(cumulativePromiseResponses[1]);

    return Math.max(...noncesFromAllGeth);
  }

  /**
   * Create contract object and fetch nonce from chain
   *
   * @param web3Provider
   * @param abi
   * @param address
   * @return {Promise<never>}
   * @private
   */
  async _createContractObjAndFetchNonce(web3Provider, abi, address) {
    const oThis = this;

    oThis.contractObj = await new web3Provider.eth.Contract(abi, address);

    if (!oThis.contractObj) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_n_c_b_3',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    // subclass specific implementation
    return oThis._fetchNonceFromContract();
  }

  /**
   * Get nonce
   *
   * @private
   */
  async _getNonce() {
    throw 'sub-class to implement';
  }

  /**
   * Fetch nonce from contract.
   *
   * @private
   */
  async _fetchNonceFromContract() {
    throw 'sub-class to implement';
  }
}

module.exports = Base;
