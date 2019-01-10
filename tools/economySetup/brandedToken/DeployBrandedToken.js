'use strict';

/**
 * Deploy Branded Token
 *
 *
 * @module tools/economySetup/DeployBrandedToken
 */

const brandedTokenSetupHelper = require('branded-token.js');

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  brandedTokenBase = require(rootPrefix + '/tools/economySetup/brandedToken/Base');

class DeployBrandedToken extends brandedTokenBase {
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.conversionRateDecimals = 5; //Temp: Need clarificaion from platform team.
  }

  /**
   *
   * performer
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;
    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_es_dbt_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * async performer
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis.initializeVars();

    let deploymentResponse = await oThis.deployBrandedToken(),
      taskResponseData = {
        brandedTokenDeployTxHash: deploymentResponse.transactionHash,
        brandedTokenContractAddress: deploymentResponse.contractAddress
      };

    return Promise.resolve(responseHelper.successWithData({ taskDone: 1, taskResponseData: taskResponseData }));
  }

  /**
   * Initialize vars
   *
   * @returns {Promise<void>}
   */
  async initializeVars() {
    const oThis = this;

    await oThis._fetchAndSetTokenDetails();
    await oThis._fetchAndSetDeployerAddress(oThis.originChainId);
    await oThis._fetchAndSetGasPrice(coreConstants.originChainKind);
    await oThis._setWeb3Instance();
  }

  /**
   *
   * @returns {Promise<void>}
   */
  async deployBrandedToken() {
    const oThis = this;

    let BrandedTokenHelper = brandedTokenSetupHelper.EconomySetup.BrandedTokenHelper,
      brandedTokenDeploymentHelper = new BrandedTokenHelper(oThis.web3Instance);

    let deployParams = {
      from: oThis.deployerAddress,
      gasPrice: oThis.gasPrice
    };

    let deploymentRsp = await brandedTokenDeploymentHelper.deploy(
      oThis.simpleTokenAddress,
      oThis.tokenSymbol,
      oThis.tokenName,
      oThis.decimal,
      oThis.conversionFactor,
      oThis.conversionRateDecimals,
      oThis.organizationAddress,
      deployParams
    );

    return deploymentRsp;
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId],
      wsProviders = originChainConfig.originGeth.readWrite.wsProviders;

    oThis.web3Instance = new SignerWeb3Provider(wsProviders[0], oThis.deployerAddress).getInstance();
  }
}
module.exports = DeployBrandedToken;
