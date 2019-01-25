'use strict';

/*
 * This class helps in progressing Mint further on CoGateway.
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressMintOnCoGateway extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.auxChainId            {Number} - Aux chain Id.
   * @param params.facilitator              {String} - Facilitator to help in progressing mint further.
   * @param params.messageHash             {String} - Stake message hash to progress mint for.
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

    await oThis._setAuxWeb3Instance();

    await oThis._fetchContractAddresses();

    let response = await oThis._performProgressMint();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.auxChainId, transactionHash: response.data.transactionHash }
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
      aux: [chainAddressConstants.auxCoGatewayContractKind]
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
    addrKinds[tokenAddressConstants.tokenCoGatewayContract] = chainAddressConstants.auxCoGatewayContractKind;

    return addrKinds;
  }

  /**
   * Perform Progress Mint
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressMint() {
    const oThis = this;

    let mosaicFacilitator = new MosaicFacilitator.CoGatewayHelper(
      oThis.auxWeb3,
      oThis.coGatewayContract,
      oThis.facilitator
    );

    let unlockSecret = util.generateHashLock(oThis.secretString).unlockSecret,
      txObject = await mosaicFacilitator._progressMintRawTx(oThis.messageHash, unlockSecret),
      data = txObject.encodeABI();

    return oThis.performTransaction(
      oThis.auxChainId,
      oThis.auxWsProviders[0],
      oThis.facilitator,
      oThis.coGatewayContract,
      data
    );
  }
}

module.exports = ProgressMintOnCoGateway;
