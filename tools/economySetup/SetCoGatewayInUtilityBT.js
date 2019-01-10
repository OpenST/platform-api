'use strict';

/*
 *  tools/economySetup/SetCoGatewayInUtilityBT.js
 *
 *  This class helps in setting co-gateway
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const BrandedTokenHelper = require('branded-token.js');

class DeployUtilityBrandedToken {
  constructor(params) {
    const oThis = this;

    oThis.web3 = null;
    oThis.auxChainId = params.auxChainId;
    oThis.deployerAddress = params.deployerAddress;
    oThis.brandedTokenContractAddress = params.brandedTokenContractAddress;
    oThis.organization = params.organization;
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
          internal_error_identifier: 't_es_scgwubt_1',
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

    await oThis._setWeb3Instance();

    await oThis._setCoGatewayInUBT();
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
    oThis.web3 = new SignerWeb3Provider(oThis.wsProviders[0], oThis.deployerAddress).getInstance(); // TODO: check the address
  }

  /**
   * _setCoGatewayInUBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCoGatewayInUBT() {
    const oThis = this;

    let deployParams = {
      deployer: oThis.deployerAddress,
      token: oThis.brandedTokenContractAddress,
      symbol: oThis.tokenSymbol,
      name: oThis.tokenName,
      decimals: oThis.decimal,
      organization: oThis.organization
    };

    let brandedTokenHelper = new BrandedTokenHelper(oThis.web3);

    await brandedTokenHelper.setCoGateway(); // txOptions, web3 are default, passed in constructor respectively
  }
}

module.exports = DeployUtilityBrandedToken;
