/**
 * Module to save USDC token details.
 *
 * @module lib/setup/originChain/SaveUsdcTokenAddresses
 */

const rootPrefix = '../../..',
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  StakeCurrencyById = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to save USDC token details in DB.
 *
 * @class SaveUsdcTokenAddresses
 */
class SaveUsdcTokenAddresses {
  /**
   * Constructor to save USDC token details in DB.
   *
   * @param {string} usdcTokenOwnerAddress
   *
   * @constructor
   */
  constructor(usdcTokenOwnerAddress) {
    const oThis = this;

    oThis.usdcTokenOwnerAddress = usdcTokenOwnerAddress;

    oThis.chainId = null;
  }

  /**
   * Perform.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/setup/originChain/SaveUsdcTokenAddresses.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_suta_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<string>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getChainIdFromConfig();

    logger.step('** Insert UsdcOwner Address into stake currencies table.');
    await oThis.insertIntoStakeCurrencies();

    return 'USDC Token Owner address is successfully saved into table.';
  }

  /**
   * Insert owner address into stake currencies.
   *
   * @return {Promise<void>}
   */
  async insertIntoStakeCurrencies() {
    const oThis = this;

    let stakeCurrencyModelObj = new StakeCurrencyModel();

    let addresses = {
      owner: oThis.usdcTokenOwnerAddress.toLowerCase()
    };

    await stakeCurrencyModelObj
      .update({
        addresses: JSON.stringify(addresses)
      })
      .where({
        symbol: stakeCurrencyConstants.USDC
      })
      .fire();

    let stakeCurrencyBySymbolCache = new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [stakeCurrencyConstants.USDC]
    });

    let cacheResponse = await stakeCurrencyBySymbolCache.fetch();

    await stakeCurrencyBySymbolCache.clear();

    let stakeCurrencyId = cacheResponse.data[stakeCurrencyConstants.USDC].id;

    await new StakeCurrencyById({
      stakeCurrencyIds: [stakeCurrencyId]
    }).clear();
  }

  /**
   * Get chain id from config.
   *
   * @sets oThis.chainId
   *
   * @return {Promise<void>}
   * @private
   */
  async _getChainIdFromConfig() {
    const oThis = this;

    const csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth];

    oThis.chainId = configForChain.chainId;
  }
}

module.exports = SaveUsdcTokenAddresses;
