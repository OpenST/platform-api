'use strict';
/**
 * This service gets the base token details. These are the tokens which users can stake in order to mint brand tokens.
 *
 * @module app/services/baseTokens/Get
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  StakeCurrencyById = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  StakeCurrencySymbolsCache = require(rootPrefix + '/lib/cacheManagement/shared/StakeCurrencySymbols'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

/**
 * Class for token details.
 *
 * @class
 */
class BaseTokens extends ServiceBase {
  /**
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.stakeCurrencySymbols = null;
    oThis.stakeCurrencyDetails = null;
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchStakeCurrencySymbols();

    await oThis._fetchStakeCurrencyDetails();

    //Prepare response data

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.baseTokens]: {}
      })
    );
  }

  /**
   * This function fetches stake currency symbol.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchStakeCurrencySymbols() {
    const oThis = this;

    let stakeCurrencySymbols = await new StakeCurrencySymbolsCache().fetch();

    if (stakeCurrencySymbols.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_bt_g_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.stakeCurrencySymbols = stakeCurrencySymbols.data;
  }

  async _fetchStakeCurrencyDetails() {
    const oThis = this;

    let stakeCurrencyDetails = await new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: oThis.stakeCurrencySymbols
    }).fetch();

    if (stakeCurrencyDetails.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_bt_g_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.stakeCurrencyDetails = stakeCurrencyDetails.data;
  }
}

module.exports = BaseTokens;
