/**
 * Module to save simple token details.
 *
 * @module lib/setup/originChain/SaveSimpleTokenAddresses
 */

const rootPrefix = '../../..',
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  AllStakeCurrencySymbolsCache = require(rootPrefix + '/lib/cacheManagement/shared/AllStakeCurrencySymbols'),
  StakeCurrencyById = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to save simple token details in DB.
 *
 * @class SaveSimpleTokenAddresses
 */
class SaveSimpleTokenAddresses {
  /**
   * Constructor to save simple token details in DB.
   *
   * @param {string} stContractOwnerAddress
   * @param {string} stContractAdminAddress
   *
   * @constructor
   */
  constructor(stContractOwnerAddress, stContractAdminAddress) {
    const oThis = this;

    oThis.stContractOwnerAddress = stContractOwnerAddress;
    oThis.stContractAdminAddress = stContractAdminAddress;

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
      logger.error('lib/setup/originChain/SaveSimpleTokenAddresses.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_ssta_1',
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

    logger.step(
      '** Insert SimpleTokenOwner, SimpleTokenAdmin and SimpleTokenContract Address into stake currencies table.'
    );
    await oThis.insertIntoStakeCurrencies();

    return 'Simple Token Owner and Admin addresses are successfully saved into table.';
  }

  /**
   * Insert admin, owner and contract address into chain addresses.
   *
   * @return {Promise<void>}
   */
  async insertIntoStakeCurrencies() {
    const oThis = this;

    let stakeCurrencyModelObj = new StakeCurrencyModel();

    let addresses = {
      owner: oThis.stContractOwnerAddress.toLowerCase(),
      admin: oThis.stContractAdminAddress.toLowerCase()
    };

    await stakeCurrencyModelObj
      .update({
        addresses: JSON.stringify(addresses)
      })
      .where({
        symbol: stakeCurrencyConstants.OST
      })
      .fire();

    // clear caches
    let stakeCurrencyBySymbolCache = new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [stakeCurrencyConstants.OST]
    });

    let cacheResponse = await stakeCurrencyBySymbolCache.fetch();

    await stakeCurrencyBySymbolCache.clear();

    let stakeCurrencyId = cacheResponse.data[stakeCurrencyConstants.OST].id;

    await new StakeCurrencyById({
      stakeCurrencyIds: [stakeCurrencyId]
    }).clear();

    await new AllStakeCurrencySymbolsCache().clear();
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

module.exports = SaveSimpleTokenAddresses;
