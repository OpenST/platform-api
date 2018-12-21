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
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
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

    let nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    console.log('params', {
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      gasPrice: oThis.gasPrice,
      gas: 30677
    });

    let simpleTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.simpleToken);
    simpleTokenContractObj.options.address =
      oThis.configStrategy[configStrategyConstants.originConstants].simpleTokenContractAddr;

    let setAdminRsp = await simpleTokenContractObj.methods
      .setAdminAddress(oThis.adminAddress)
      .send({
        from: oThis.signerAddress,
        nonce: nonceRsp.data['nonce'],
        gasPrice: oThis.gasPrice,
        gas: 30677
      })
      .catch(function(errorResponse) {
        return errorResponse;
      });

    oThis.removeKeyFromWallet();

    console.log('setAdminRsp', setAdminRsp);

    return setAdminRsp;
  }
}

InstanceComposer.registerAsShadowableClass(SetSimpleTokenAdmin, coreConstants.icNameSpace, 'SetSimpleTokenAdmin');

module.exports = SetSimpleTokenAdmin;
