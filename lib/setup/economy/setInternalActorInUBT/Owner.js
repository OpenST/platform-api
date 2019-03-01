'use strict';

/**
 *  @module lib/setup/economy/setInternalActorInUBT/Owner
 *
 */

const rootPrefix = '../../../..',
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  Base = require(rootPrefix + '/lib/setup/economy/setInternalActorInUBT/Base'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

class Owner extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.tokenId: tokenId
   * @param {Integer} params.auxChainId - chainId
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   *
   * @private
   */
  _setInternalActorAddress() {
    const oThis = this;
    oThis.internalActorAddress = oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind];
  }
}

InstanceComposer.registerAsShadowableClass(Owner, coreConstants.icNameSpace, 'SetInternalActorForOwnerInUBT');

module.exports = {};
