'use strict';
/**
 * This module would be used to Approve Co-gateway to spend StPrime
 *
 * @module lib/redeemAndUnstake/stPrime/ApproveCoGateway
 */
const rootPrefix = '../../..',
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

/**
 * Class for Approving Co-gateway contract in st-prime contract for redeemer.
 *
 * @class
 */
class ApproveCoGateway extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.coGatewayContractAddress = null;
    oThis.stPrimeContractAddress = null;
  }

  /**
   * Set Aux web3 instance
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    await oThis._setAuxWeb3Instance();
  }

  /**
   * Fetch contract addresses
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.stPrimeContractAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeContractKind].address;
    oThis.coGatewayContractAddress = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Get approve data to be submitted in transaction.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getApproveData() {
    const oThis = this;

    return ContractInteractLayer.getApproveData(
      oThis.auxWeb3,
      oThis.stPrimeContractAddress,
      oThis.coGatewayContractAddress,
      oThis.amountToRedeem
    );
  }

  /**
   * Build transaction data to be submitted
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    let txData = await oThis._getApproveData();

    oThis.transactionData = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.approveCoGatewayGas,
      value: '0x0',
      from: oThis.redeemerAddress,
      to: oThis.stPrimeContractAddress,
      data: txData
    };
  }

  /**
   * Get chain id on which transaction would be submitted
   *
   * @returns {*}
   * @private
   */
  _getChainId() {
    const oThis = this;

    return oThis.auxChainId;
  }

  /**
   * Extra data to be merged in response
   *
   * @returns {{}}
   * @private
   */
  _mergeExtraResponseData() {
    return {};
  }
}

module.exports = ApproveCoGateway;
