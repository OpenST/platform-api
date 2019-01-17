'use strict';

/*
 * This class helps in progressing Mint further on CoGateway.
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressMintOnCoGateway extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.auxChainId            {Number} - Aux chain Id.
   * @param params.facilitator              {String} - Facilitator to help in progressing mint further.
   * @param params.messageHash             {String} - Stake message hash to progress mint for.
   * @param params.unlockSecret              {String} - Secret to prove messageHash.
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
          taskDone: 0,
          taskResponseData: { transactionHash: response.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskDone: 0, taskResponseData: JSON.stringify(response) }));
    }
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
      aux: [chainAddressConstants.auxCoGatewayContractKind]
    };
  }

  /**
   * Perform Progress Mint
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressMint() {
    const oThis = this;

    let mosaicFacilitator = new MosaicFacilitator.CoGatewayHelper(oThis.auxWeb3, oThis.coGatewayContract, oThis.facilitator);

    let txObject = await mosaicFacilitator._progressMintRawTx(oThis.messageHash, oThis.unlockSecret),
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
