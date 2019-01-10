'use strict';

/*
 *  tools/economySetup/DeployUtilityBrandedToken.js
 *
 *  This class helps in deployment of utility branded token on auxiliary chain
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  Base = require(rootPrefix + '/tools/economySetup/brandedToken/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const BrandedTokenHelper = require('branded-token.js');

class DeployUtilityBrandedToken extends Base {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.web3Instance = null;
    oThis.auxChainId = params.auxChainId;
    oThis.deployerAddress = null;
    oThis.brandedTokenContractAddress = params.brandedTokenContractAddress;
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

    await oThis._fetchAndSetDeployerAddress(oThis.auxChainId);

    await oThis._setWeb3Instance();

    await oThis._fetchAndSetTokenDetails();

    await oThis._deployUtilityBrandedToken();
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = response[oThis.auxChainId];
    oThis.wsProviders = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;
    oThis.web3 = new SignerWeb3Provider(oThis.wsProviders[0], oThis.deployerAddress).getInstance();
  }

  /**
   * _deployUtilityBrandedToken
   *
   * @return {Promise<void>}
   * @private
   */
  async _deployUtilityBrandedToken() {
    const oThis = this;

    let deployParams = {
      deployer: oThis.deployerAddress,
      token: oThis.brandedTokenContractAddress,
      symbol: oThis.symbol,
      name: oThis.name,
      decimals: oThis.decimal,
      organization: oThis.organization
    };

    let brandedTokenHelper = new BrandedTokenHelper(oThis.web3Instance);

    await brandedTokenHelper.setup(deployParams); // txOptions, web3 are default, passed in constructor respectively
  }
}

module.exports = DeployUtilityBrandedToken;
