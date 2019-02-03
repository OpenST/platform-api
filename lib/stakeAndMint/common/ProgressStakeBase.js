'use strict';

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/OldBase');

class ProgressStakeOnGateway extends StakeAndMintBase {
  /**
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.facilitator = params.facilitator;
    oThis.secretString = params.secretString;
    oThis.messageHash = params.messageHash;

    oThis.gatewayContract = null;
  }

  /**
   * async perform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchGatewayContract();

    let response = await oThis._performProgressStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.originChainId, transactionHash: response.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          taskResponseData: JSON.stringify(response)
        })
      );
    }
  }

  /**
   * perform progress stake
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressStake() {
    const oThis = this;

    let mosaicFacilitator = new MosaicFacilitator.GatewayHelper(
      oThis.originWeb3,
      oThis.gatewayContract,
      oThis.facilitator
    );

    let unlockSecret = util.generateHashLock(oThis.secretString).unlockSecret,
      txObject = await mosaicFacilitator._progressStakeRawTx(oThis.messageHash, unlockSecret),
      data = txObject.encodeABI();

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.facilitator,
      oThis.gatewayContract,
      data
    );
  }

  /**
   * Fetch gateway contract address
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayContract() {
    throw 'sub-class to implement';
  }
}

module.exports = ProgressStakeOnGateway;
