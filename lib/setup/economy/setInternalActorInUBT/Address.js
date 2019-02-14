'use strict';
/**
 * Class to set internal actor in UBT.
 *
 * @module lib/setup/economy/setInternalActorInUBT/SetInternalActorForUBT
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  Base = require(rootPrefix + '/lib/setup/economy/setInternalActorInUBT/Base');

class SetInternalActorForUBT extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.tokenId: tokenId
   * @param {Integer} params.auxChainId - chainId
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   * @param {String} params.address: address.
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.address = params.address;
  }

  /**
   * Set internal actor address.
   *
   * @private
   */
  _setInternalActorAddress() {
    const oThis = this;

    if (!CommonValidators.validateEthAddress(oThis.address)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_siaiu_a_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { address: oThis.address }
        })
      );
    }
    oThis.internalActorAddress = oThis.address;
  }
}

InstanceComposer.registerAsShadowableClass(SetInternalActorForUBT, coreConstants.icNameSpace, 'SetInternalActorForUBT');

module.exports = {};
