'use strict';

/**
 *  @module lib/setup/economy/SetInternalActorForOwner
 *
 *  This class helps in setting owner address as internal actor
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseFundingKlass = require(rootPrefix + '/lib/fund/oStPrime/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class FundOstPrimeByChainOwner extends BaseFundingKlass {
  /**
   * Constructor to deploy token organization
   *
   * @param {Object} params
   * @param {Integer} params.toAddress: address to be funded
   * @param {BigNumber} params.transferValueInWei: amount to be funded
   * @param {Object} params.pendingTransactionExtraData: pending tx extra data
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.transferValueInWei = params.transferValueInWei;
    oThis.toAddress = params.toAddress;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
  }

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;
    oThis.fromAddress = await oThis._getChainOwnerAddress();

    if (!oThis.toAddress || !oThis.fromAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'f_ostp_bco_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            fromAddress: oThis.fromAddress,
            toAddress: oThis.toAddress
          }
        })
      );
    }
  }

  /***
   *
   *
   *
   * @private
   */
  _setTransferValueInWei() {
    //do nothing as already set in constructor
  }
}

InstanceComposer.registerAsShadowableClass(
  FundOstPrimeByChainOwner,
  coreConstants.icNameSpace,
  'FundOstPrimeByChainOwner'
);

module.exports = FundOstPrimeByChainOwner;
