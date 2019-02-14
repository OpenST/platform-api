'use strict';
/**
 * Module would help in Approving Gateway contract in Simple Token(Base token contract) for Stake amount.
 *
 * @module lib/stakeAndMint/stPrime/Approve
 */
const BigNumber = require('bignumber.js'),
  MosaicJs = require('@openstfoundation/mosaic.js');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

/**
 * Class for approving gateway contract in Simple Token for Stake amount.
 *
 * @class
 */
class ApproveOriginGatewayInBase extends StakeAndMintBase {
  /**
   * Constructor for approving gateway contract in Simple Token for Stake amount.
   *
   * @param {Object} params
   * @param {Number} params.originChainId
   * @param {Number} params.auxChainId
   * @param {String} params.stakerAddress
   * @param {Number} params.amountToStake
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.stakerAddress = params.stakerAddress;
    oThis.amountToStake = params.amountToStake;

    oThis.gatewayContract = null;
    oThis.baseContract = null;
    oThis.amountToApprove = null;
  }

  /**
   * Async performer
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis.amountToApprove = new BigNumber(oThis.amountToStake);
    if (!oThis.amountToApprove) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_sp_agib_1',
          api_error_identifier: 'amount_invalid',
          debug_options: {}
        })
      );
    }

    await oThis._setOriginWeb3Instance();

    await oThis._fetchRequiredAddresses();

    // If contract addresses are not found
    if (!oThis.gatewayContract || !oThis.baseContract) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_sp_agib_2',
          api_error_identifier: 'contract_not_found',
          debug_options: {}
        })
      );
    }

    let resp = await oThis._sendApproveTransaction();

    if (resp.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: resp.data.transactionHash,
          taskResponseData: { chainId: oThis.originChainId, transactionHash: resp.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: { err: JSON.stringify(resp) }
        })
      );
    }
  }

  /**
   * Fetch required addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchRequiredAddresses() {
    const oThis = this;

    // Fetch gateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;

    // Fetch base contract address
    chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 });
    chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.baseContract = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
  }

  /**
   * Send approve transaction
   *
   * @return {Promise<void>}
   *
   *  @private
   */
  async _sendApproveTransaction() {
    const oThis = this;

    let mosaicStakeHelper = new MosaicJs.Helpers.StakeHelper(),
      txObject = mosaicStakeHelper._approveStakeAmountRawTx(
        oThis.amountToApprove.toString(10),
        {},
        oThis.originWeb3,
        oThis.baseContract,
        oThis.gatewayContract,
        oThis.stakerAddress
      );

    let data = txObject.encodeABI(),
      txOptions = {
        gas: contractConstants.approveOSTGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.stakerAddress,
      oThis.baseContract,
      txOptions,
      data
    );
  }
}

module.exports = ApproveOriginGatewayInBase;
