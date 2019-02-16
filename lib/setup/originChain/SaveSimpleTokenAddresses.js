'use strict';

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

class SimpleTokenSetup {
  /**
   * Constructor
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
   * Perform
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/originChain/SaveSimpleTokenAddresses.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_oc_ssta_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async perform
   *
   * @return {Promise<result>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getChainIdFromConfig();

    logger.step('** Insert SimpleTokenOwner and SimpleTokenAdmin Address into chain addresses table.');
    await oThis.insertAdminAndOwnerIntoChainAddresses();

    return 'Simple Token Owner and Admin addresses are successfully saved into table.';
  }

  /**
   * Insert admin and owner into chain addresses.
   *
   * @return {Promise<void>}
   */
  async insertAdminAndOwnerIntoChainAddresses() {
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

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: 0 }).clear();
  }

  /**
   * Get chain id from config.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _getChainIdFromConfig() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth];

    oThis.chainId = configForChain.chainId;
  }
}

module.exports = SimpleTokenSetup;
