/**
 * Module to finalize simple token contract.
 *
 * @module tools/chainSetup/origin/simpleToken/Finalize
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
 * Class to finalize simple token contract.
 *
 * @class FinalizeSimpleToken
 */
class FinalizeSimpleToken extends SetupSimpleTokenBase {
  /**
   * Constructor to finalize simple token contract.
   *
   * @param {object} params
   * @param {string} params.signerAddress: address who signs Tx
   * @param {string} params.signerKey: private key of signerAddress
   * @param {string} params.simpleTokenContractAddress: simple token contract address
   *
   * @augments SetupSimpleTokenBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

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

    const finalizeRsp = await oThis._finalizeSimpleToken();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.initializeBaseContractStepKind, finalizeRsp);

    return finalizeRsp;
  }

  /**
   * Finalize simple token.
   *
   * @return {Promise}
   * @private
   */
  async _finalizeSimpleToken() {
    const oThis = this;

    const nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    const params = {
      from: oThis.signerAddress,
      nonce: nonceRsp.data.nonce,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.finalizeSimpleTokenGas
    };

    const simpleTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.simpleToken);
    simpleTokenContractObj.options.address = oThis.simpleTokenContractAddress;

    const transactionReceipt = await simpleTokenContractObj.methods
      .finalize()
      .send(params)
      .catch(function(errorResponse) {
        logger.error(errorResponse);

        return responseHelper.error({
          internal_error_identifier: 't_cs_o_ag_st_f_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: errorResponse }
        });
      });

    const finalizeRsp = responseHelper.successWithData({
      transactionHash: transactionReceipt.transactionHash,
      transactionReceipt: transactionReceipt
    });

    finalizeRsp.debugOptions = {
      inputParams: {
        signerAddress: oThis.signerAddress
      },
      processedParams: {}
    };

    return finalizeRsp;
  }
}

InstanceComposer.registerAsShadowableClass(FinalizeSimpleToken, coreConstants.icNameSpace, 'FinalizeSimpleToken');

module.exports = FinalizeSimpleToken;
