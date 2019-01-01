'use strict';

/**
 * finalize
 *
 * @module tools/chainSetup/origin/simpleToken/Finalize
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  SetupSimpleTokenBase = require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

/**
 *
 * @class
 */
class FinalizeSimpleToken extends SetupSimpleTokenBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.signerKey - private key of signerAddress
   *
   * @constructor
   */
  constructor(params) {
    super(params);
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

    oThis.addKeyToWallet();

    let finalizeRsp = await oThis._finalizeSimpleToken();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.initializeBaseContractStepKind, finalizeRsp);

    return finalizeRsp;
  }

  /***
   *
   * finallize simple token
   *
   * @return {Promise}
   *
   * @private
   */
  async _finalizeSimpleToken() {
    const oThis = this;

    let nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    let params = {
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      gasPrice: oThis.gasPrice,
      gas: 28555
    };

    let simpleTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.simpleToken);
    simpleTokenContractObj.options.address = await oThis.getSimpleTokenContractAddr();

    let finalizeRsp = await simpleTokenContractObj.methods
      .finalize()
      .send(params)
      .catch(function(errorResponse) {
        return errorResponse;
      });

    finalizeRsp.debugOptions = {
      inputParams: {
        signerAddress: oThis.signerAddress
      },
      transactionParams: {}
    };

    return finalizeRsp;
  }
}

InstanceComposer.registerAsShadowableClass(FinalizeSimpleToken, coreConstants.icNameSpace, 'FinalizeSimpleToken');

module.exports = FinalizeSimpleToken;
