'use strict';
const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

// Following require(s) for registering into instance composer
require(rootPrefix + '/tools/economySetup/CreateEconomy');

class SyncInView {
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.tokenAddressKindMap = {};
  }

  /**
   * Get address of various kinds.
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
   * Create entry in economy table in DynamoDB.
   *
   * @
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async perform() {
    const oThis = this,
      brandedTokenContract = await oThis._getAddressesForTokens(TokenAddressConstants.brandedTokenContract),
      CreateEconomy = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'CreateEconomy'),
      simpleStakeContractAddress = await oThis._getAddressesForTokens(TokenAddressConstants.simpleStakeContract),
      params = {
        tokenId: oThis.tokenId,
        chainId: oThis.chainId,
        simpleStakeAddress: simpleStakeContractAddress,
        brandedTokenContract: brandedTokenContract,
        chainEndpoint: oThis._configStrategyObject.chainRpcProvider(oThis.chainId, 'readWrite')
      },
      createEconomy = new CreateEconomy(params);

    await createEconomy.perform();
  }
}

module.exports = SyncInView;
