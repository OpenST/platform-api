/**
 * Module to mint USDC tokens.
 *
 * @module tools/chainSetup/origin/usdcToken/Mint
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
 * Class to mint USDC tokens.
 *
 * @class MintUsdcToken
 */
class MintUsdcToken extends SetupUsdcTokenBase {
  /**
   * Constructor to mint USDC tokens.
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

    // Contract mint specific parameters.
    oThis.toAddress = params.signerAddress;
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

    const finalizeRsp = await oThis._mint();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.configureMinterBaseContractStepKind, finalizeRsp);

    return finalizeRsp;
  }

  /**
   * Mint USDC tokens.
   *
   * @return {Promise}
   * @private
   */
  async _mint() {
    const oThis = this;

    const nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    const params = {
      from: oThis.signerAddress,
      nonce: nonceRsp.data.nonce,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.mintUsdcTokenGas
    };

    const usdcTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.usdc);
    usdcTokenContractObj.options.address = oThis.usdcContractAddress;

    const transactionReceipt = await usdcTokenContractObj.methods
      .mint(oThis.toAddress, contractConstants.usdcTokenAmount)
      .send(params)
      .catch(function(errorResponse) {
        logger.error(errorResponse);

        return responseHelper.error({
          internal_error_identifier: 't_cs_o_ut_m_1',
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

InstanceComposer.registerAsShadowableClass(MintUsdcToken, coreConstants.icNameSpace, 'MintUsdcToken');

module.exports = MintUsdcToken;
