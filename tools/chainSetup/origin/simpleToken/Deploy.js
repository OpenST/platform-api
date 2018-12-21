'use strict';

/**
 * Deploy simpleToken
 *
 * @module tools/chainSetup/origin/simpleToken/Deploy
 */
const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  DeployerKlass = require(rootPrefix + '/tools/helpers/deploy'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  CoreBins = require(rootPrefix + '/config/CoreBins');

/**
 *
 * @class
 */
class DeploySimpleToken extends SetupSimpleTokenBase {
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

    let nonceRsp = oThis.fetchNonce(oThis.signerAddress);

    let deployParams = {
      deployerAddr: oThis.signerAddress,
      gasPrice: oThis.gasPrice,
      gas: 1164898,
      web3Provider: oThis.web3Instance,
      contractBin: CoreBins.simpleToken,
      contractAbi: CoreAbis.simpleToken,
      nonce: nonceRsp.data['nonce']
    };

    let deployerObj = new DeployerKlass(deployParams),
      deployerResponse = await deployerObj.perform().catch(function(errorResponse) {
        return errorResponse;
      });

    oThis.removeKeyFromWallet();

    if (deployerResponse.isSuccess()) {
      //TODO: append data for config strategy update
    }

    return deployerResponse;
  }
}

InstanceComposer.registerAsShadowableClass(DeploySimpleToken, coreConstants.icNameSpace, 'DeploySimpleToken');

module.exports = DeploySimpleToken;
