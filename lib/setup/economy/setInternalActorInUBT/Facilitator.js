'use strict';

/**
 *  @module lib/setup/economy/setInternalActorInUBT/Facilitator
 *
 */

const rootPrefix = '../../../..',
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  Base = require(rootPrefix + '/lib/setup/economy/setInternalActorInUBT/Base'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class Facilitator extends Base {
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
  async _setInternalActorAddress() {
    const oThis = this;
    await oThis._setChainAddresses();
    oThis.internalActorAddress = oThis.chainAddresses[chainAddressConstants.interChainFacilitatorKind].address;
  }

  /***
   *
   * @private
   */
  async _setChainAddresses() {
    const oThis = this;

    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_e_siaubt_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.chainAddresses = chainAddressesRsp.data;
  }

  /**
   *
   * pendingTransactionKind
   *
   * @private
   *
   * @return {String}
   *
   */
  get _pendingTransactionKind() {
    const oThis = this;
    return pendingTransactionConstants.setInternalActorForFacilitatorInUBTKind;
  }
}

InstanceComposer.registerAsShadowableClass(
  Facilitator,
  coreConstants.icNameSpace,
  'SetInternalActorForFacilitatorInUBT'
);

module.exports = {};
