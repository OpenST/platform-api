'use strict';

/**
 * Deploy Branded Token
 *
 *
 * @module tools/economySetup/DeployBrandedToken
 */

const brandedTokenSetupHelper = require('branded-token.js'),
  OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../..',
  InstanceComposer = OSTBase.InstanceComposer,
  BrandedTokenBase = require(rootPrefix + '/tools/economySetup/brandedToken/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class DeployOriginBrandedToken extends BrandedTokenBase {
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.originChainId = params.originChainId;
    oThis.organizationAddress = params.tokenOriOrgCntrctAddr;

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

    let deploymentResponse = await oThis._deployBrandedToken(),
      taskResponseData = {
        btCntrctAddr: deploymentResponse.contractAddress
      };

    oThis.SignerWeb3Instance.removeAddressKey(oThis.deployerAddress);

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1,
        taskResponseData: taskResponseData,
        transactionHash: deploymentResponse.transactionHash
      })
    );
  }

  /**
   * Initialize vars
   *
   * @returns {Promise<void>}
   */
  async initializeVars() {
    const oThis = this;

    oThis.deployChainId = oThis._configStrategyObject.originChainId;
    await oThis._fetchAndSetTokenDetails();
    await oThis._fetchAndSetDeployerAddress();
    await oThis._fetchAndSetSimpleTokenAddress();
    await oThis._fetchAndSetGasPrice(coreConstants.originChainKind);
    await oThis._setWeb3Instance();
  }

  /**
   *
   * @returns {Promise<void>}
   */
  async _deployBrandedToken() {
    const oThis = this;

    let BrandedTokenHelper = brandedTokenSetupHelper.EconomySetup.BrandedTokenHelper,
      brandedTokenDeploymentHelper = new BrandedTokenHelper(oThis.web3Instance);

    let deployParams = {
      from: oThis.deployerAddress,
      gasPrice: oThis.gasPrice
    };

    // TODO:: oThis.conversionFactor calculate and replace '1'.
    let deploymentRsp = await brandedTokenDeploymentHelper.deploy(
      oThis.simpleTokenAddress,
      oThis.tokenSymbol,
      oThis.tokenName,
      oThis.decimal,
      1,
      oThis.conversionRateDecimals,
      oThis.organizationAddress,
      deployParams
    );

    return deploymentRsp;
  }
}

InstanceComposer.registerAsShadowableClass(DeployOriginBrandedToken, coreConstants.icNameSpace, 'deployBrandedToken');
module.exports = DeployOriginBrandedToken;
