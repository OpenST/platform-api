'use strict';

/*
 * This class helps in progressing Mint further on CoGateway.
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressMintOnCoGateway extends StakeAndMintBase {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.tokenId                  {Number} - Token id.
   * @param params.auxChainId               {Number} - Aux chain Id.
   * @param params.facilitator              {String} - Facilitator to help in progressing mint further.
   * @param params.secretString             {String} - Secret to generate unlock secret.
   * @param params.messageHash              {String} - Stake message hash to progress mint for.
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.auxChainId = params.auxChainId;
    oThis.facilitator = params.facilitator;
    oThis.secretString = params.secretString;
    oThis.messageHash = params.messageHash;
  }

  /**
   * _asyncPerform - async performer
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
   * Chain address kinds to fetch
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
   * Token address kinds to fetch
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
