'use strict';

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/fund/stPrime/Base'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

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
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
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

    let response = await oThis._fundAddress(
      oThis.toAddress,
      oThis.transferValueInWei,
      oThis.pendingTransactionExtraData
    );

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: response.data['transactionHash'],
        taskResponseData: response.data.txOptions
      })
    );
  }

  /***
   * _setAddresses - Set from and to addresses
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

    oThis.addresses = { [oThis.addressKind]: oThis.toAddress }; // Will be used in fetching balance from chain
  }

  /***
   * _getChainOwnerAddress - Get chain owner address
   *
   * @return {Promise<String>}
   * @private
   */
  async _getChainOwnerAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'f_stp_ta_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }

  /***
   * _setTransferValueInWei - Set transfer value
   *
   * @return {string}
   * @private
   */
  _setTransferValueInWei() {
    const oThis = this;

    switch (oThis.addressKind) {
      case tokenAddressConstants.auxAdminAddressKind:
        oThis.transferValueInWei = basicHelper.convertToWei(0.05); // OstPrime according to the calculations
        break;
      case tokenAddressConstants.auxWorkerAddressKind:
        oThis.transferValueInWei = basicHelper.convertToWei(0.05); // OstPrime according to the calculations
        break;
      case tokenAddressConstants.auxFunderAddressKind:
        oThis.transferValueInWei = basicHelper.convertToWei(0.2); // OstPrime according to the calculations
        break;
      default:
        throw `unhandled addressKind: ${oThis.addressKind}`;
    }
  }
}

module.exports = FundStPrimeToTokenAddress;
