'use strict';

/**
 * Deploy simpleToken
 *
 * @module tools/chainSetup/origin/simpleToken/Deploy
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SetupSimpleTokenBase = require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
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

    let deployerResponse = await oThis._deployContract();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.deploySimpleToken, deployerResponse);

    oThis._insertIntoChainAddress(deployerResponse);

    return deployerResponse;
  }

  /***
   *
   * deploy contract
   *
   * @return {Promise}
   *
   * @private
   */
  async _deployContract() {
    const oThis = this;

    let nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

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
        logger.error(errorResponse);
        return errorResponse;
      });

    deployerResponse.debugOptions = {
      inputParams: {
        deployerAddr: oThis.signerAddress
      },
      transactionParams: {}
    };

    if (deployerResponse.isSuccess()) {
      //TODO: append data for config strategy update
    }

    return deployerResponse;
  }

  /***
   *
   * insert simple token contract address into chain address
   *
   * @return {Promise}
   *
   * @private
   */
  async _insertIntoChainAddress(deployerResponse) {
    const oThis = this;

    if (deployerResponse.isFailure()) return deployerResponse;

    await new ChainAddressModel().insertAddress({
      address: deployerResponse.data['contractAddress'],
      chainId: oThis.configStrategyObject.originChainId,
      kind: chainAddressConstants.invertedKinds[chainAddressConstants.simpleTokenContractKind],
      chainKind: chainAddressConstants.invertedChainKinds[chainAddressConstants.originChainKind]
    });
  }
}

InstanceComposer.registerAsShadowableClass(DeploySimpleToken, coreConstants.icNameSpace, 'DeploySimpleToken');

module.exports = DeploySimpleToken;
