/**
 * Module to configure minter for USDC token contract.
 *
 * @module tools/chainSetup/origin/usdcToken/ConfigureMinter
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  SetupUsdcTokenBase = require(rootPrefix + '/tools/chainSetup/origin/usdcToken/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

/**
 * Class to configure minter for USDC token contract.
 *
 * @class ConfigureMinterForUsdcToken
 */
class ConfigureMinterForUsdcToken extends SetupUsdcTokenBase {
  /**
   * Constructor to configure minter for USDC token contract.
   *
   * @param {object} params
   * @param {string} params.signerAddress: address who signs Tx
   * @param {string} params.signerKey: private key of signerAddress
   * @param {string} params.usdcContractAddress: USDC token contract address
   *
   * @augments SetupUsdcTokenBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.usdcContractAddress = params.usdcContractAddress;

    // Contract minter configuration specific parameters.
    oThis.minterAddress = params.signerAddress;
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

    const finalizeRsp = await oThis._configureMinter();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.configureMinterBaseContractStepKind, finalizeRsp);

    return finalizeRsp;
  }

  /**
   * Configure minter for USDC token contract.
   *
   * @return {Promise}
   * @private
   */
  async _configureMinter() {
    const oThis = this;

    const nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    const params = {
      from: oThis.signerAddress,
      nonce: nonceRsp.data.nonce,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.configureMinterForUsdcTokenGas
    };

    const usdcTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.usdc);
    usdcTokenContractObj.options.address = oThis.usdcContractAddress;

    const transactionReceipt = await usdcTokenContractObj.methods
      .configureMinter(oThis.minterAddress, contractConstants.usdcTokenMintingLimit)
      .send(params)
      .catch(function(errorResponse) {
        logger.error(errorResponse);

        return responseHelper.error({
          internal_error_identifier: 't_cs_o_ut_cm_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: errorResponse }
        });
      });

    const configureMinterRsp = responseHelper.successWithData({
      transactionHash: transactionReceipt.transactionHash,
      transactionReceipt: transactionReceipt
    });

    configureMinterRsp.debugOptions = {
      inputParams: {
        signerAddress: oThis.signerAddress
      },
      processedParams: {}
    };

    return configureMinterRsp;
  }
}

InstanceComposer.registerAsShadowableClass(
  ConfigureMinterForUsdcToken,
  coreConstants.icNameSpace,
  'ConfigureMinterForUsdcToken'
);

module.exports = ConfigureMinterForUsdcToken;
