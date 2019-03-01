'use strict';

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

require(rootPrefix + '/tools/chainSetup/DeployLib');
require(rootPrefix + '/tools/chainSetup/SetupOrganization');

const InstanceComposer = OSTBase.InstanceComposer;

class OriginOneTimeContractsSetup {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(originChainId) {
    const oThis = this;

    oThis.chainId = originChainId;

    oThis.sleepTime = coreConstants.environment === environmentInfoConstants.environment.development ? 5000 : 60000;
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
        logger.error('lib/setup/originChain/OneTimeContracts.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_oc_otc_1',
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

    logger.step('* Deploying organization for simple token.');
    await oThis._setupOriginOrganization(chainAddressConstants.stOrgContractKind);
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    logger.step('* Deploying organization for anchor.');
    await oThis._setupOriginOrganization(chainAddressConstants.originAnchorOrgContractKind);
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    logger.step('** Deploy libraries.');

    logger.log('* [Origin]: Deploy MerklePatriciaProof Library');
    await oThis._deployLib(coreConstants.originChainKind, 'merklePatriciaProof');
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    logger.log('* [Origin]: Deploy MessageBus');
    await oThis._deployLib(coreConstants.originChainKind, 'messageBus');
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    logger.log('* [Origin]: Deploy GatewayLib');
    await oThis._deployLib(coreConstants.originChainKind, 'gateway');
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);
  }

  /**
   * Deploy origin organization for simple token
   *
   * @param addressKind
   *
   * @returns {Promise<Promise<result>|*|Promise>}
   *
   * @private
   */
  async _setupOriginOrganization(addressKind) {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.chainId]),
      config = rsp[oThis.chainId],
      ic = new InstanceComposer(config),
      SetupOrganization = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetupOrganization');

    return new SetupOrganization({
      chainKind: coreConstants.originChainKind,
      addressKind: addressKind
    }).perform();
  }

  /**
   * Deploy origin libraries
   *
   * @param chainKind
   * @param libKind
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _deployLib(chainKind, libKind) {
    const oThis = this;

    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data),
      DeployLib = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployLib');

    return new DeployLib({
      chainKind: chainKind,
      libKind: libKind
    }).perform();
  }
}

module.exports = OriginOneTimeContractsSetup;
