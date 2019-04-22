/**
 * Module to save USDC token details.
 *
 * @module lib/setup/originChain/SaveUsdcTokenAddresses
 */

const rootPrefix = '../../..',
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
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

    logger.step('** Insert UsdcOwner Address into chain addresses table.');
    await oThis.insertIntoChainAddresses();

    return 'USDC Token Owner address is successfully saved into table.';
  }

  /**
   * Insert owner address into chain addresses.
   *
   * @return {Promise<void>}
   */
  async insertIntoChainAddresses() {
    const oThis = this;

    await new ChainAddressModel().insertAddress({
      associatedAuxChainId: 0,
      addressKind: chainAddressConstants.usdcContractOwnerKind,
      address: oThis.usdcTokenOwnerAddress,
      status: chainAddressConstants.activeStatus
    });

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: 0 }).clear();
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
