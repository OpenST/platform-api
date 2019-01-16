'use strict';

/*
 *  Module would help in Approving Gateway contract in Simple Token for Stake amount.
 *
 *  @module lib/stakeMintManagement/ApproveGatewayInBt
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  contractHelper = require(rootPrefix + '/helpers/contractHelper');

class ApproveGatewayInBt extends Base {
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

    await oThis._setWeb3Instance();

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
      return Promise.resolve(responseHelper.successWithData({ taskDone: 0, taskResponseData: resp.toJSON() }));
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

    let contractObject = await contractHelper.getMosaicTbdContractObj(
      oThis.originWeb3,
      'EIP20Token',
      oThis.baseContract
    );

    let data = contractObject.methods.approve(oThis.gatewayContract, oThis.amountToStake).encodeABI();

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.stakerAddress,
      oThis.baseContract,
      data
    );
  }
}

module.exports = ApproveGatewayInBt;
