'use strict';

/**
 *  @module lib/setup/economy/SetInternalActorForOwner
 *
 *  This class helps in setting owner address as internal actor
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  BaseFundingKlass = require(rootPrefix + '/lib/fund/oStPrime/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class FundOstPrimeToTokenAddress extends BaseFundingKlass {
  /**
   *
   * @param {Object} params
   * @param {Integer} params.tokenId: token id for which addresses are to be funded
   * @param {String} params.addressKind: address kind to be funded
   * @param {Object} params.pendingTransactionExtraData: pending tx extra data
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.addressKind = params.addressKind;
  }

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    switch (oThis.addressKind) {
      case tokenAddressConstants.auxAdminAddressKind:
      case tokenAddressConstants.auxWorkerAddressKind:
        oThis.fromAddress = getAddrRsp.data[tokenAddressConstants.auxFunderAddressKind];
        break;
      case tokenAddressConstants.auxFunderAddressKind:
        oThis.fromAddress = await oThis._getChainOwnerAddress();
        break;
      default:
        throw `unhandled addressKind: ${oThis.addressKind}`;
    }

    switch (oThis.addressKind) {
      case tokenAddressConstants.auxWorkerAddressKind:
        oThis.toAddress = getAddrRsp.data[oThis.addressKind][0];
        break;
      default:
        oThis.toAddress = getAddrRsp.data[oThis.addressKind];
    }

    if (!oThis.toAddress || !oThis.fromAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'f_ostp_ta_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            fromAddress: oThis.fromAddress,
            toAddress: oThis.toAddress,
            addressKind: oThis.addressKind
          }
        })
      );
    }
  }

  /***
   *
   * @return {string}
   * @private
   */
  _setTransferValueInWei() {
    const oThis = this;
    switch (oThis.addressKind) {
      case tokenAddressConstants.auxAdminAddressKind:
        oThis.transferValueInWei = basicHelper.convertToWei(0.000076113); // OstPrime according to the calculations
        break;
      case tokenAddressConstants.auxWorkerAddressKind:
        oThis.transferValueInWei = basicHelper.convertToWei(0.000073812); // OstPrime according to the calculations
        break;
      case tokenAddressConstants.auxFunderAddressKind:
        oThis.transferValueInWei = basicHelper.convertToWei(0.0002); // OstPrime according to the calculations
        break;
      default:
        throw `unhandled addressKind: ${oThis.addressKind}`;
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  FundOstPrimeToTokenAddress,
  coreConstants.icNameSpace,
  'FundOstPrimeToTokenAddress'
);

module.exports = FundOstPrimeToTokenAddress;
