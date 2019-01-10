'use strict';

/**
 * Deploy Branded Token
 *
 *
 * @module tools/economySetup/DeployBrandedToken
 */

const brandedTokenSetupHelper = require('branded-token.js');

const rootPrefix = '../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Tokens'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class DeployBrandedToken {
  constructor(params) {
    //set params to oThis
  }

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
   *{
    deployer: config.deployerAddress,
    valueToken: config.simpleTokenContractAddress,
    symbol: "BT"
    name: "MyBrandedToken"
    decimals: "18"
    conversionRate:
    conversionRateDecimals:
    organization:
  }
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;
  }

  async _fetchTokenDetails() {
    const oThis = this;

    let tokenDetails = await new TokenModel()
      .select(['id', 'client_id', 'name', 'symbol', 'conversion_factor', 'decimal'])
      .where(['client_id = ?', oThis.clientId])
      .fire();

    if (tokenDetails.length === 0) {
      logger.error('Token details not found');
    }

    oThis.tokenName = tokenDetails[0].name;
    oThis.tokenSymbol = tokenDetails[0].symbol;
    oThis.conversionFactor = tokenDetails[0].conversion_factor;
    oThis.decimal = tokenDetails[0].decimal;
  }
}
