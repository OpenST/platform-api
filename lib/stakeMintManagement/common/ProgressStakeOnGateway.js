'use strict';

/*
 * This class helps in progressing stake further on gateway.
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressStakeOnGateway extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.originChainId            {Number} - Origin chain Id.
   * @param params.facilitator              {String} - Facilitator to help in progressing stake further.
   * @param params.messageHash             {String} - Stake message hash to progress stake for.
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

    await oThis._setOriginWeb3Instance();

    await oThis._fetchContractAddresses();

    let response = await oThis._performProgressStake();

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
      origin: [chainAddressConstants.originGatewayContractKind]
    };
  }

  /**
   * Perform progress stake
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressStake() {
    const oThis = this;

    let mosaicFacilitator = new MosaicFacilitator.GatewayHelper(oThis.originWeb3, oThis.gatewayContract, oThis.facilitator);

    let txObject = await mosaicFacilitator._progressStakeRawTx(oThis.messageHash, oThis.unlockSecret),
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
