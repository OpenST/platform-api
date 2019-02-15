'use strict';

const MosaicJs = require('@openstfoundation/mosaic.js');

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

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

    let contractInteract = new MosaicJs.ContractInteract.EIP20Gateway(oThis.originWeb3, oThis.gatewayContract);

    let unlockSecret = util.generateHashLock(oThis.secretString).unlockSecret,
      txObject = await contractInteract.progressStakeRawTx(oThis.messageHash, unlockSecret),
      data = txObject.encodeABI(),
      gasPrice = await oThis._fetchGasPrice(),
      txOptions = {
        gasPrice: gasPrice,
        gas: contractConstants.progressStakeGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.facilitator,
      oThis.gatewayContract,
      txOptions,
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

  /**
   * Fetch gas price
   *
   * @private
   */
  async _fetchGasPrice() {
    throw 'sub-class to implement';
  }
}

module.exports = ProgressStakeOnGateway;
