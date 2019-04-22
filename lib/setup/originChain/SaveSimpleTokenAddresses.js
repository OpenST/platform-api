/**
 * Module to save simple token details.
 *
 * @module lib/setup/originChain/SaveSimpleTokenAddresses
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
 * Class to save simple token details in DB.
 *
 * @class SimpleTokenSetup
 */
class SimpleTokenSetup {
  /**
   * Constructor to save simple token details in DB.
   *
   * @param {string} stContractOwnerAddress
   * @param {string} stContractAdminAddress
   * @param {string} stContractAddress
   *
   * @constructor
   */
  constructor(stContractOwnerAddress, stContractAdminAddress, stContractAddress) {
    const oThis = this;

    oThis.stContractOwnerAddress = stContractOwnerAddress;
    oThis.stContractAdminAddress = stContractAdminAddress;
    oThis.stContractAddress = stContractAddress;

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
      '** Insert SimpleTokenOwner, SimpleTokenAdmin and SimpleTokenContract Address into chain addresses table.'
    );
    await oThis.insertIntoChainAddresses();

    return 'Simple Token Owner and Admin addresses are successfully saved into table.';
  }

  /**
   * Insert admin, owner and contract address into chain addresses.
   *
   * @return {Promise<void>}
   */
  async insertIntoChainAddresses() {
    const oThis = this;

    await new ChainAddressModel().insertAddress({
      associatedAuxChainId: 0,
      addressKind: chainAddressConstants.stContractOwnerKind,
      address: oThis.stContractOwnerAddress,
      status: chainAddressConstants.activeStatus
    });

    await new ChainAddressModel().insertAddress({
      associatedAuxChainId: 0,
      addressKind: chainAddressConstants.stContractAdminKind,
      address: oThis.stContractAdminAddress,
      status: chainAddressConstants.activeStatus
    });

    await new ChainAddressModel().insertAddress({
      address: oThis.stContractAddress,
      associatedAuxChainId: 0,
      addressKind: chainAddressConstants.stContractKind,
      deployedChainId: oThis.chainId,
      deployedChainKind: coreConstants.originChainKind,
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

module.exports = SimpleTokenSetup;
