'use strict';
/**
 * Set admin
 *
 * @module tools/chainSetup/origin/simpleToken/SetAdminAddress
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  SetupSimpleTokenBase = require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Base'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis');

/**
 *
 * @class
 */
class SetSimpleTokenAdmin extends SetupSimpleTokenBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.signerKey - private key of signerAddress
   * @param {String} params.adminAddress - address which is to be made admin
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.adminAddress = params['adminAddress'];
  }

  /**
   * asyncPerform
   *
   * @ignore
   *
   * @return {Promise}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.setGasPrice();

    oThis.addKeyToWallet();

    let setAdminRsp = await oThis._setAdminAddress();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.setBaseContractAdminStepKind, setAdminRsp);

    return setAdminRsp;
  }

  /***
   *
   * set admin address
   *
   * @return {Promise}
   *
   * @private
   */
  async _setAdminAddress() {
    const oThis = this;

    let nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    let params = {
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      gasPrice: oThis.gasPrice,
      gas: 4000000
    };

    let simpleTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.simpleToken);
    simpleTokenContractObj.options.address = await oThis.getSimpleTokenContractAddr();

    let transactionReceipt = await simpleTokenContractObj.methods
      .setAdminAddress(oThis.adminAddress)
      .send(params)
      .catch(function(errorResponse) {
        logger.error(errorResponse);
        return responseHelper.error({
          internal_error_identifier: 't_cs_o_ag_st_saa_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: errorResponse }
        });
      });

    let setAdminRsp = responseHelper.successWithData({
      transactionHash: transactionReceipt.transactionHash,
      transactionReceipt: transactionReceipt
    });

    setAdminRsp.debugOptions = {
      inputParams: {
        signerAddress: oThis.signerAddress
      },
      processedParams: {
        adminAddress: oThis.adminAddress,
        simpleTokenContractAddress: simpleTokenContractObj.options.address
      }
    };

    return setAdminRsp;
  }
}

InstanceComposer.registerAsShadowableClass(SetSimpleTokenAdmin, coreConstants.icNameSpace, 'SetSimpleTokenAdmin');

module.exports = SetSimpleTokenAdmin;
