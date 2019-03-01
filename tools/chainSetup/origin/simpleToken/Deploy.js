'use strict';
/**
 * Deploy simpleToken
 *
 * @module tools/chainSetup/origin/simpleToken/Deploy
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  CoreBins = require(rootPrefix + '/config/CoreBins'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SetupSimpleTokenBase = require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  DeployerKlass = require(rootPrefix + '/tools/helpers/Deploy'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract');

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

    await oThis.setGasPrice();

    oThis.addKeyToWallet();

    let deployerResponse = await oThis._deployContract();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.deployBaseContractStepKind, deployerResponse);

    await oThis._insertIntoChainAddress(deployerResponse);

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
      gas: contractConstants.deploySimpleTokenGas,
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
        signerAddress: oThis.signerAddress
      },
      processedParams: {}
    };

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
      associatedAuxChainId: 0,
      addressKind: chainAddressConstants.stContractKind,
      deployedChainId: oThis.configStrategyObject.originChainId,
      deployedChainKind: coreConstants.originChainKind,
      status: chainAddressConstants.activeStatus
    });

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: 0 }).clear();
  }
}

InstanceComposer.registerAsShadowableClass(DeploySimpleToken, coreConstants.icNameSpace, 'DeploySimpleToken');

module.exports = DeploySimpleToken;
