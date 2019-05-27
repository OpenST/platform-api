/**
 * Module to initialize USDC token contract.
 *
 * @module tools/chainSetup/origin/usdcToken/Initialize
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
 * Class to initialize USDC token contract.
 *
 * @class InitializeUsdcToken
 */
class InitializeUsdcToken extends SetupUsdcTokenBase {
  /**
   * Constructor to initialize USDC token contract.
   *
   * @param {object} params
   * @param {string} params.signerAddress: address who signs Tx
   * @param {string} params.signerKey: private key of signerAddress
   * @param {string} params.usdcContractAddress: USDC token contract address
   * @param {string} params.usdcTokenOwnerAddress: USDC token owner address
   * @param {string} params.contractSymbol: USDC token contract symbol
   * @param {string} params.contractCurrency: USDC token contract fiat currency
   * @param {string} params.contractDecimals: USDC token contract decimals
   *
   * @augments SetupUsdcTokenBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.usdcContractAddress = params.usdcContractAddress;
    oThis.usdcTokenOwnerAddress = params.usdcTokenOwnerAddress;

    oThis.contractName = 'USD//C';

    // Contract initialization specific parameters.
    oThis.contractSymbol = params.contractSymbol;
    oThis.contractCurrency = params.contractCurrency;
    oThis.contractDecimals = params.contractDecimals;
    oThis.masterMinterAddress = params.usdcTokenOwnerAddress;
    oThis.pauserAddress = params.usdcTokenOwnerAddress;
    oThis.blacklisterAddress = params.usdcTokenOwnerAddress;
    oThis.ownerAddress = params.usdcTokenOwnerAddress;
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

    const setAdminRsp = await oThis._initialize();

    oThis.removeKeyFromWallet();

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.initializeBaseContractStepKind, setAdminRsp);

    return setAdminRsp;
  }

  /**
   * Initialize USDC token contract.
   *
   * @return {Promise}
   * @private
   */
  async _initialize() {
    const oThis = this;

    const nonceRsp = await oThis.fetchNonce(oThis.signerAddress);

    const params = {
      from: oThis.signerAddress,
      nonce: nonceRsp.data.nonce,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.initializeUsdcTokenGas
    };

    const usdcTokenContractObj = new oThis.web3Instance.eth.Contract(CoreAbis.usdc);
    usdcTokenContractObj.options.address = oThis.usdcContractAddress;

    const transactionReceipt = await usdcTokenContractObj.methods
      .initialize(
        oThis.contractName,
        oThis.contractSymbol,
        oThis.contractCurrency,
        oThis.contractDecimals,
        oThis.masterMinterAddress,
        oThis.pauserAddress,
        oThis.blacklisterAddress,
        oThis.ownerAddress
      )
      .send(params)
      .catch(function(errorResponse) {
        logger.error(errorResponse);

        return responseHelper.error({
          internal_error_identifier: 't_cs_o_ut_i_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: errorResponse }
        });
      });

    const initializeRsp = responseHelper.successWithData({
      transactionHash: transactionReceipt.transactionHash,
      transactionReceipt: transactionReceipt
    });

    initializeRsp.debugOptions = {
      inputParams: {
        signerAddress: oThis.signerAddress
      },
      processedParams: {
        adminAddress: oThis.adminAddress,
        usdcContractAddress: usdcTokenContractObj.options.address
      }
    };

    return initializeRsp;
  }
}

InstanceComposer.registerAsShadowableClass(InitializeUsdcToken, coreConstants.icNameSpace, 'InitializeUsdcToken');

module.exports = InitializeUsdcToken;
