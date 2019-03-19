'use strict';

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  fundingAmounts = require(rootPrefix + '/config/funding'),
  tokenAuxFunderRequirement = require(rootPrefix + '/lib/calculateTokenAuxFunderSTPRequirement'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  TransferStPrime = require(rootPrefix + '/lib/fund/stPrime/Transfer');

class FundStPrimeToTokenAddress {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
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
  async perform() {
    const oThis = this;

    await oThis._setAddresses();

    await oThis._setTransferValueInWei();

    let response = await new TransferStPrime({
      fromAddress: oThis.fromAddress,
      toAddress: oThis.toAddress,
      amountInWei: oThis.transferValueInWei,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData,
      auxChainId: oThis.auxChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.fundOstPrimeKind
    }).perform();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskPending,
      transactionHash: response.data.transactionHash,
      debugParams: response.data.txOptions
    });
  }

  /***
   * _setAddresses - Set from and to addresses
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let tokenAddressCacheResponse = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    // determine the fromAddress
    switch (oThis.addressKind) {
      case tokenAddressConstants.auxAdminAddressKind:
      case tokenAddressConstants.auxWorkerAddressKind:
        oThis.fromAddress = tokenAddressCacheResponse.data[tokenAddressConstants.auxFunderAddressKind];
        break;
      case tokenAddressConstants.auxFunderAddressKind:
        oThis.fromAddress = await oThis._getChainOwnerAddress();
        break;
      case tokenAddressConstants.tokenUserOpsWorkerKind:
        oThis.fromAddress = tokenAddressCacheResponse.data[tokenAddressConstants.auxFunderAddressKind];
        break;
      case tokenAddressConstants.recoveryControllerAddressKind:
        oThis.fromAddress = tokenAddressCacheResponse.data[tokenAddressConstants.auxFunderAddressKind];
        break;
      default:
        throw `unhandled addressKind: ${oThis.addressKind}`;
    }

    // determine the toAddress
    switch (oThis.addressKind) {
      case tokenAddressConstants.auxWorkerAddressKind:
        oThis.toAddress = tokenAddressCacheResponse.data[oThis.addressKind][0];
        break;
      default:
        oThis.toAddress = tokenAddressCacheResponse.data[oThis.addressKind];
    }

    if (!oThis.toAddress || !oThis.fromAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_fstptta_1',
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
   * _setTransferValueInWei - Set transfer value
   *
   * @return {string}
   * @private
   */
  _setTransferValueInWei() {
    const oThis = this;

    let fundingAmountsAuxGasMap = fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas,
      amountToTransfer = null;

    switch (oThis.addressKind) {
      case tokenAddressConstants.auxAdminAddressKind:
        amountToTransfer = fundingAmountsAuxGasMap[tokenAddressConstants.auxAdminAddressKind].fundAmount;
        oThis.transferValueInWei = basicHelper.convertToWei(amountToTransfer);
        break;
      case tokenAddressConstants.auxWorkerAddressKind:
        amountToTransfer = fundingAmountsAuxGasMap[tokenAddressConstants.auxWorkerAddressKind].fundAmount;
        oThis.transferValueInWei = basicHelper.convertToWei(amountToTransfer);
        break;
      case tokenAddressConstants.auxFunderAddressKind:
        let amountToTransferinWei = oThis._fetchTokenAuxFunderStPrimeRequirement();
        oThis.transferValueInWei = amountToTransferinWei;
        break;
      case tokenAddressConstants.tokenUserOpsWorkerKind:
        amountToTransfer = fundingAmountsAuxGasMap[tokenAddressConstants.tokenUserOpsWorkerKind].fundAmount;
        oThis.transferValueInWei = basicHelper.convertToWei(amountToTransfer);
        break;
      case tokenAddressConstants.recoveryControllerAddressKind:
        amountToTransfer = fundingAmountsAuxGasMap[tokenAddressConstants.recoveryControllerAddressKind].fundAmount;
        oThis.transferValueInWei = basicHelper.convertToWei(amountToTransfer);
        break;
      default:
        throw `unhandled addressKind: ${oThis.addressKind}`;
    }
  }

  /**
   * Calculates final st prime requirement for token aux funder
   *
   * @returns {string} st prime requirement in wei
   * @private
   */
  _fetchTokenAuxFunderStPrimeRequirement() {
    const oThis = this;

    let amountRequirement = tokenAuxFunderRequirement.perform(),
      auxMaxGasPriceMultiplierWithBuffer = basicHelper.getAuxMaxGasPriceMultiplierWithBuffer(),
      amountForOneGwei = amountRequirement[tokenAddressConstants.auxFunderAddressKind].maxBalanceToFundAtOneGwei,
      finalAmount = basicHelper
        .convertToBigNumber(String(amountForOneGwei))
        .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer))
        .plus(basicHelper.convertToWei(1));

    return finalAmount.toString(10);
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
          internal_error_identifier: 'l_s_e_fstptta_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }
}

module.exports = FundStPrimeToTokenAddress;
