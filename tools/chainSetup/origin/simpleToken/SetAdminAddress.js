/**
 * Module to set admin address in simple token contract.
 *
 * @module tools/chainSetup/origin/simpleToken/SetAdminAddress
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  SetupSimpleTokenBase = require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

/**
 * Class to set admin address in simple token contract.
 *
 * @class SetSimpleTokenAdmin
 */
class SetSimpleTokenAdmin extends SetupSimpleTokenBase {
  /**
   * Constructor to set admin address in simple token contract.
   *
   * @param {object} params
   * @param {string} params.signerAddress: address who signs Tx
   * @param {string} params.signerKey: private key of signerAddress
   * @param {string} params.adminAddress: address which is to be made admin
   * @param {string} params.simpleTokenContractAddress: simple token contract address
   *
   * @augments SetupSimpleTokenBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.adminAddress = params.adminAddress;
    oThis.simpleTokenContractAddress = params.simpleTokenContractAddress;
  }

  /**
   * Async perform.
   *
   * @ignore
   *
   * @return {Promise}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.setGasPrice();

    oThis.addKeyToWallet();

    const setAdminRsp = await oThis._setAdminAddress();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.setBaseContractAdminStepKind, setAdminRsp);

    return setAdminRsp;
  }

  /**
   * Set admin address.
   *
   * @return {Promise}
   * @private
   */
  async _setAdminAddress() {
    const oThis = this;

    const nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    const params = {
      from: oThis.signerAddress,
      nonce: nonceRsp.data.nonce,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.setAdminSimpleTokenGas
    };

    const simpleTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.simpleToken);
    simpleTokenContractObj.options.address = oThis.simpleTokenContractAddress;

    const transactionReceipt = await simpleTokenContractObj.methods
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

    const setAdminRsp = responseHelper.successWithData({
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
