'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

class SimpleTokenSetup {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(owner, admin) {
    const oThis = this;

    oThis.owner = owner;
    oThis.admin = admin;
    oThis.chainId = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
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
          internal_error_identifier: 't_ls_ocs_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getChainIdFromConfig();

    logger.step('** Insert SimpleTokenOwner and SimpleTokenAdmin Address into chain addresses table.');
    await oThis.insertAdminOwnerIntoChainAddresses();

    return Promise.resolve('Simple Token Owner and Admin addresses are successfully saved into table. ');
  }

  async insertAdminOwnerIntoChainAddresses() {
    const oThis = this;

    await new ChainAddressModel().insertAddress({
      address: oThis.owner,
      chainId: oThis.chainId,
      chainKind: coreConstants.originChainKind,
      kind: chainAddressConstants.simpleTokenOwnerKind
    });
    await new ChainAddressModel().insertAddress({
      address: oThis.admin,
      chainId: oThis.chainId,
      chainKind: coreConstants.originChainKind,
      kind: chainAddressConstants.simpleTokenAdminKind
    });
  }

  async _getChainIdFromConfig() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth];

    oThis.chainId = configForChain.chainId;

    return Promise.resolve();
  }
}

module.exports = SimpleTokenSetup;
