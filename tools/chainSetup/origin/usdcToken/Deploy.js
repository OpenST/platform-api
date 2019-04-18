/**
 * Module to deploy USDC token.
 *
 * @module tools/chainSetup/origin/usdcToken/Deploy
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  CoreBins = require(rootPrefix + '/config/CoreBins'),
  DeployerKlass = require(rootPrefix + '/tools/helpers/Deploy'),
  SetupUsdcTokenBase = require(rootPrefix + '/tools/chainSetup/origin/usdcToken/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

/**
 * Class to deploy USDC token.
 *
 * @class DeployUsdcToken
 */
class DeployUsdcToken extends SetupUsdcTokenBase {
  /**
   * Constructor to deploy USDC token.
   *
   * @param {object} params
   * @param {string} params.signerAddress: address who signs Tx
   * @param {string} params.signerKey: private key of signerAddress
   *
   * @augments SetupUsdcTokenBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Async perform.
   *
   * @ignore
   * @return {Promise}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.setGasPrice();

    oThis.addKeyToWallet();

    const deployerResponse = await oThis._deployContract();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.deployBaseContractStepKind, deployerResponse);

    return deployerResponse;
  }

  /**
   * Deploy contract.
   *
   * @return {Promise<*>}
   * @private
   */
  async _deployContract() {
    const oThis = this;

    const nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    const deployParams = {
      deployerAddr: oThis.signerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployUsdcTokenGas,
      web3Provider: oThis.web3Instance,
      contractBin: CoreBins.usdc,
      contractAbi: CoreAbis.usdc,
      nonce: nonceRsp.data.nonce
    };

    const deployerObj = new DeployerKlass(deployParams),
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
}

InstanceComposer.registerAsShadowableClass(DeployUsdcToken, coreConstants.icNameSpace, 'DeployUsdcToken');

module.exports = DeployUsdcToken;
