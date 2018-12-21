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
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

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

    let nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    let params = {
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      gasPrice: oThis.gasPrice,
      gas: 28555
    };

    let simpleTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.simpleToken);
    simpleTokenContractObj.options.address =
      oThis.configStrategy[configStrategyConstants.originConstants].simpleTokenContractAddr;

    let setAdminRsp = await simpleTokenContractObj.methods
      .finalize()
      .send(params)
      .catch(function(errorResponse) {
        return errorResponse;
      });

    oThis.removeKeyFromWallet();

    return setAdminRsp;
  }
}

InstanceComposer.registerAsShadowableClass(FinalizeSimpleToken, coreConstants.icNameSpace, 'FinalizeSimpleToken');

module.exports = FinalizeSimpleToken;
