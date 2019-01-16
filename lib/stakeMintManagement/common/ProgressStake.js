'use strict';

/*
 * This class file helps in progressing stake in gateway
 */

const rootPrefix = '../..',
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base');

// const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressStake extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.originChainId            {Number}
   * @param params.gatewayContract          {String}
   * @param params.lastSyncedBlock          {Number}
   * @param params.gatewayContract          {String}
   * @param params.facilitator              {String}
   * @param params.stakeMessageHash         {String}
   * @param params.unlockSecret             {String}
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

    await oThis._setWeb3Instance();

    await oThis._performProgressStake();
  }

  /**
   * _performProgressStake
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressStake() {
    const oThis = this;

    let gasPrice = '0';

    // let mosaicFacilitator = new MosaicFacilitator.Helpers.Gateway({
    //   contractAddress: oThis.gatewayContract
    // });

    let contractHelper = require(rootPrefix + '/helpers/contractHelper');

    let mosaicFacilitator = await contractHelper.getMosaicTbdContractObj(
      oThis.originWeb3,
      'EIP20Gateway',
      oThis.gatewayContract
    );
    mosaicFacilitator = mosaicFacilitator.methods;

    //TODO: ==== uncomment mosaicFacilitator fetch code and remove above code

    let data = mosaicFacilitator.progressStake(oThis.stakeMessageHash, oThis.unlockSecret).encodeABI();

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.facilitator,
      oThis.gatewayContract,
      data
    );
  }
}

module.exports = ProgressStake;
