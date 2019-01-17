'use strict';

/*
 *  Module would help in Approving Gateway contract in Simple Token for Stake amount.
 *
 *  @module lib/stakeMintManagement/ApproveOriginGatewayInBase
 */

const rootPrefix = '../../..',
  MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base');

class ApproveOriginGatewayInBase extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.originChainId   {Number}
   * @param params.auxChainId      {Number}
   * @param params.stakerAddress   {String}
   * @param params.amountToStake   {Number}
   *
   */
  constructor(params) {
    super(params);
  }

  /**
   * _addressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _addressKindsToFetch() {
    const oThis = this;

    return {
      origin: [chainAddressConstants.originGatewayContractKind, chainAddressConstants.baseContractKind]
    };
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchContractAddresses();

    // If contract addresses are not found
    if (!oThis.gatewayContract || !oThis.baseContract) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_agib_2',
          api_error_identifier: 'contract_not_found',
          debug_options: {}
        })
      );
    }

    let resp = await oThis._sendApproveTransaction();

    if (resp.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskDone: 0,
          taskResponseData: { transactionHash: resp.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskDone: 0, taskResponseData: JSON.stringify(resp) }));
    }
  }

  /**
   * Send approve transaction
   *
   * @return {Promise<void>}
   * @private
   */
  async _sendApproveTransaction() {
    const oThis = this;

    let mosaicStakeHelper = new MosaicTbd.Helpers.StakeHelper,
      txObject = mosaicStakeHelper._approveStakeAmountRawTx(oThis.amountToStake,
        {}, oThis.originWeb3, oThis.baseContract, oThis.gatewayContract, oThis.stakerAddress);

    let data = txObject.encodeABI();

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.stakerAddress,
      oThis.baseContract,
      data
    );
  }
}

module.exports = ApproveOriginGatewayInBase;
