/**
 * Module for service to get the base token details. These are the tokens which users can stake in order to mint brand tokens.
 *
 * @module app/services/baseTokens/Get
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  StakeCurrencySymbolsCache = require(rootPrefix + '/lib/cacheManagement/shared/StakeCurrencySymbols'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class for service to get the base token details. These are the tokens which users can stake in order to mint brand tokens.
 *
 * @class BaseTokens
 */
class BaseTokens extends ServiceBase {
  /**
   * Constructor for service to get the base token details.
   * These are the tokens which users can stake in order to mint brand tokens.
   *
   * @param {object} params
   *
   * @augments ServiceBase
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
   * Async perform.
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchStakeCurrencySymbols();

    await oThis._fetchStakeCurrencyDetails();

    // Prepare response data.
    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.baseTokens]: {
          stakeCurrencyDetails: oThis.stakeCurrencyDetails
        }
      })
    );
  }

  /**
   * This function fetches stake currency symbols.
   *
   * @sets oThis.stakeCurrencySymbols
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchStakeCurrencySymbols() {
    const oThis = this;

    const stakeCurrencySymbols = await new StakeCurrencySymbolsCache().fetch();

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

  /**
   * This function fetches stake currency details.
   *
   * @sets oThis.stakeCurrencyDetails
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchStakeCurrencyDetails() {
    const oThis = this;

    const stakeCurrencyDetails = await new StakeCurrencyBySymbolCache({
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
