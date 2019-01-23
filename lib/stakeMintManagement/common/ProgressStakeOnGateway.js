'use strict';

/*
 * This class helps in progressing stake further on gateway.
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressStakeOnGateway extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.originChainId            {Number} - Origin chain Id.
   * @param params.facilitator              {String} - Facilitator to help in progressing stake further.
   * @param params.messageHash             {String} - Stake message hash to progress stake for.
   * @param params.secretString              {String} - Secret to generate unlock secret.
   *
   */
  constructor(params) {
    super(params);
  }

  /**
   * _asyncPerform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchContractAddresses();

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
   * _chainAddressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _chainAddressKindsToFetch() {
    const oThis = this;

    return {
      origin: [chainAddressConstants.originGatewayContractKind]
    };
  }

  /**
   * _tokenAddressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _tokenAddressKindsToFetch() {
    const oThis = this;

    let addrKinds = {};
    addrKinds[tokenAddressConstants.tokenGatewayContract] = chainAddressConstants.originGatewayContractKind;

    return addrKinds;
  }

  /**
   * Perform progress stake
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
}

module.exports = ProgressStakeOnGateway;
