'use strict';

/*
 *  tools/economySetup/DeployUtilityBrandedToken.js
 *
 *  This class helps in deployment of utility branded token on auxiliary chain
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  Base = require(rootPrefix + '/tools/economySetup/brandedToken/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const brandedTokenSetupHelper = require('branded-token.js');

class DeployUtilityBrandedToken extends Base {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.web3Instance = null;
    oThis.deployerAddress = null;
    oThis.brandedTokenContractAddress = params.btCntrctAddr;
    oThis.organization = params.tokenAuxOrgCntrctAddr;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
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
          internal_error_identifier: 't_es_dubt_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis.initializeVars();

    let deploymentResponse = await oThis._deployUtilityBrandedToken();

    let taskResponseData = {
      ubtCntrctAddr: deploymentResponse.contractAddress
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

    oThis.deployChainId = oThis.auxChainId;
    await oThis._fetchAndSetTokenDetails();
    await oThis._fetchAndSetDeployerAddress();
    await oThis._fetchAndSetGasPrice(coreConstants.auxChainKind);
    await oThis._setWeb3Instance();
  }

  /**
   * _deployUtilityBrandedToken
   *
   * @return {Promise<void>}
   * @private
   */
  async _deployUtilityBrandedToken() {
    const oThis = this;

    let BrandedTokenHelper = brandedTokenSetupHelper.EconomySetup.UtilityBrandedTokenHelper,
      brandedTokenDeploymentHelper = new BrandedTokenHelper(oThis.web3Instance);

    //_token, _symbol, _name, _decimals, _organization, txOptions, web3

    let deployParams = {
      from: oThis.deployerAddress,
      gasPrice: oThis.gasPrice
    };

    let contractResponse = await brandedTokenDeploymentHelper.deploy(
      oThis.brandedTokenContractAddress,
      oThis.tokenSymbol,
      oThis.tokenName,
      oThis.decimal,
      oThis.organization,
      deployParams
    ); // web3 are default, passed in constructor respectively

    return Promise.resolve(contractResponse);
  }
}

InstanceComposer.registerAsShadowableClass(
  DeployUtilityBrandedToken,
  coreConstants.icNameSpace,
  'deployUtilityBrandedToken'
);

module.exports = DeployUtilityBrandedToken;
