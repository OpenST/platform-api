'use strict';

/**
 * set admin
 *
 * @module tools/chainSetup/origin/simpleToken/SetAdminAddress
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  SetupSimpleTokenBase = require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Base'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
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
      gas: 30677
    };

    let simpleTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.simpleToken);
    simpleTokenContractObj.options.address = await oThis.getSimpleTokenContractAddr();

    let setAdminRsp = await simpleTokenContractObj.methods
      .setAdminAddress(oThis.adminAddress)
      .send(params)
      .catch(function(errorResponse) {
        console.error(errorResponse);
        return errorResponse;
      });

    setAdminRsp.debugOptions = {
      inputParams: {
        signerAddress: oThis.signerAddress
      },
      processedParams: {
        adminAddress: oThis.adminAddress
      }
    };

    return setAdminRsp;
  }
}

InstanceComposer.registerAsShadowableClass(SetSimpleTokenAdmin, coreConstants.icNameSpace, 'SetSimpleTokenAdmin');

module.exports = SetSimpleTokenAdmin;
