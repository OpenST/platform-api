'use strict';

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/fund/stPrime/Base'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  minBalances = require(rootPrefix + '/lib/fund/MinBalances');

const BigNumber = require('bignumber.js');

class FundStPrimeToTokenAddress extends Base {
  /**
   *
   * @param {Object} params
   * @param {Integer} params.originChainId: origin chain id
   * @param {Integer} params.auxChainId: aux chain id
   * @param {Integer} params.tokenId: token id for which addresses are to be funded
   * @param {String} params.addressKind: address kind to be funded
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.addressKind = params.addressKind;
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._setWeb3Instance();

    await oThis._setAddresses();

    await oThis._fetchBalances();

    await oThis._setTransferValueInWei();

    await oThis._fundAddress(oThis.toAddress, oThis.amount);
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
          internal_error_identifier: 'f_stp_ta_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            fromAddress: oThis.fromAddress,
            toAddress: oThis.toAddress,
            addressKind: oThis.addressKind
          }
        })
      );
    }

    oThis.addresses = { [oThis.addressKind]: oThis.toAddress };
  }

  /***
   *
   * @return {Promise<String>}
   * @private
   */
  async _getChainOwnerAddress() {
    const oThis = this;

    let chainOwnerAddressRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.ownerKind
    });

    return chainOwnerAddressRsp.data.address;
  }

  /***
   *
   * @return {string}
   * @private
   */
  _setTransferValueInWei() {
    const oThis = this;

    let minBalance = minBalances[oThis.addressKind],
      actualBalance = oThis.balances[oThis.addressKind];

    let minBalanceBN = new BigNumber(minBalance),
      actualBalanceBN = new BigNumber(actualBalance);

    if (minBalanceBN.gt(actualBalanceBN)) {
      oThis.amount = minBalanceBN.minus(actualBalanceBN).toString(10);
    }
  }
}

module.exports = FundStPrimeToTokenAddress;
