'use strict';
/**
 * This module creates entry for new economy in dynamo db.
 *
 * @module app/services/token/SyncInView.js
 */

const rootPrefix = '../../..',
  CreateEconomy = require(rootPrefix + '/tools/economySetup/CreateEconomy'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  TokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class for SyncInView
 *
 * @class
 */
class SyncInView {
  /**
   * Constructor
   *
   * @param params
   * @param {Integer} params.tokenId - Id of token table
   * @param {Integer} params.chainId
   *
   * @constructor
   */

  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.tokenAddressKindMap = {};
  }

  /**
   * Create entry in economy table in DynamoDB.
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._getTokenAddresses();

    let brandedTokenContract = await oThis._getAddressesForTokens(TokenAddressConstants.brandedTokenContract),
      simpleStakeContractAddress = await oThis._getAddressesForTokens(TokenAddressConstants.simpleStakeContract),
      chainEndPoint = await oThis._getRpcProvider(),
      params = {
        tokenId: oThis.tokenId,
        chainId: oThis.chainId,
        simpleStakeAddress: simpleStakeContractAddress,
        brandedTokenContract: brandedTokenContract,
        chainEndpoint: chainEndPoint[0]
      };

    let createEconomy = new CreateEconomy(params);

    await createEconomy.perform();
  }

  /**
   * Get address of various kinds from Token addresses table.
   *
   * @returns {Promise<>}
   *
   * @private
   *
   * @sets tokenAddressKindMap
   */
  async _getTokenAddresses() {
    const oThis = this;
    let addresses = await new TokenAddressModel()
      .select('*')
      .where([
        'token_id = ? AND kind in (?)',
        oThis.tokenId,
        [
          new TokenAddressModel().invertedKinds[TokenAddressConstants.simpleStakeContract],
          new TokenAddressModel().invertedKinds[TokenAddressConstants.brandedTokenContract]
        ]
      ])
      .order_by('id DESC')
      .fire();

    for (let i = 0; i < addresses.length; i++) {
      let addressData = addresses[i],
        addressKind = new TokenAddressModel().kinds[addressData.kind];
      oThis.tokenAddressKindMap[addressKind] = oThis.tokenAddressKindMap[addressKind] || [];
      oThis.tokenAddressKindMap[addressKind].push(addressData.address);
    }
  }

  /**
   * Get token address for given kind.
   *
   * @param {String} addressKind: address got given kind
   *
   * @returns {String}: one address for uniq kinds, and array for multiple possible kinds
   *
   * @private
   */
  _getAddressesForTokens(addressKind) {
    const oThis = this;

    if (TokenAddressConstants.uniqueKinds.indexOf(addressKind) > -1) {
      return oThis.tokenAddressKindMap[addressKind][0];
    } else {
      return oThis.tokenAddressKindMap[addressKind];
    }
  }

  /**
   * Get rpc provider
   *
   * @return {Object}
   */
  async _getRpcProvider() {
    const oThis = this;
    let strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure()) {
      return Promise.reject(configStrategyResp);
    }
    const configStrategyObj = new ConfigStrategyObject(configStrategyResp.data);

    return configStrategyObj.chainRpcProviders(oThis.chainId, 'readWrite');
  }
}

module.exports = SyncInView;
