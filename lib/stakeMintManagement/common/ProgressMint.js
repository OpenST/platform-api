'use strict';

/*
 * This class file helps in progressing mint in co-gateway
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/signSubmitTrxOnChain'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressMint extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.auxChainId               {Number}
   * @param params.coGatewayContract        {String}
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

    await oThis._performProgressMint();
  }

  /**
   * _performProgressMint
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressMint() {
    const oThis = this;

    let gasPrice = '0';

    // let mosaicFacilitator = new MosaicFacilitator.Helpers.coGateway({
    //   contractAddress: oThis.coGatewayContract
    // });

    let contractHelper = require(rootPrefix + '/helpers/contractHelper');

    let mosaicFacilitator = await contractHelper.getMosaicTbdContractObj(
      oThis.auxWeb3,
      'EIP20CoGateway',
      oThis.coGatewayContract
    );
    mosaicFacilitator = mosaicFacilitator.methods;

    //TODO: ==== uncomment mosaicFacilitator fetch code and remove above code

    let data = mosaicFacilitator.progressMint(oThis.stakeMessageHash, oThis.unlockSecret).encodeABI();

    return oThis.performTransaction(
      oThis.auxChainId,
      oThis.auxWsProviders[0],
      oThis.facilitator,
      oThis.coGatewayContract,
      data
    );
  }
}

module.exports = ProgressMint;
