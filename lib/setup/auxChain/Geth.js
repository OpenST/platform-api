'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  gethManager = require(rootPrefix + '/tools/localSetup/gethManager'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  serviceManager = require(rootPrefix + '/tools/localSetup/serviceManager'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

/**
 * Class for aux geth setup.
 *
 * @class
 */
class AuxGethSetup {
  /**
   * Constructor for aux geth setup.
   *
   * @param {Number} originChainId
   * @param {Number} auxChainId
   *
   * @constructor
   */
  constructor(originChainId, auxChainId) {
    const oThis = this;

    oThis.originChainId = originChainId;
    oThis.auxChainId = auxChainId;
  }

  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/auxChain/Geth.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_ac_g_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  async asyncPerform() {
    const oThis = this;

    await oThis._getIc();

    let allocAddressToAmountMap = {};

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_ac_g_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let chainOwnerAddress = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
    oThis.originDeployerAddress = chainAddressesRsp.data[chainAddressConstants.originDeployerKind].address;
    oThis.stOrgContractOwnerAddress = chainAddressesRsp.data[chainAddressConstants.stOrgContractOwnerKind].address;
    oThis.originAnchorOrgContractOwnerAddress =
      chainAddressesRsp.data[chainAddressConstants.originAnchorOrgContractOwnerKind].address;

    allocAddressToAmountMap[chainOwnerAddress] = coreConstants.OST_AUX_STPRIME_TOTAL_SUPPLY;

    logger.step('** Init GETH with genesis');
    let initChainRes = await gethManager.initChain(
      coreConstants.auxChainKind,
      oThis.auxChainId,
      allocAddressToAmountMap
    );

    logger.step('** Starting Auxiliary GETH for deployment.');
    await serviceManager.startGeth(
      coreConstants.auxChainKind,
      oThis.auxChainId,
      'deployment',
      initChainRes.sealerAddress
    );

    // TODO - add GETH checker
    await basicHelper.pauseForMilliSeconds(5000);

    logger.step('* Stopping auxiliary GETH.');
    await serviceManager.stopAuxGeth(oThis.auxChainId);

    logger.step('** Starting Auxiliary GETH with non-zero gas price.');
    await serviceManager.startGeth(coreConstants.auxChainKind, oThis.auxChainId, '', initChainRes.sealerAddress);

    await basicHelper.pauseForMilliSeconds(5000);

    logger.step('* Stopping auxiliary GETH.');
    await serviceManager.stopAuxGeth(oThis.auxChainId);

    return {};
  }

  async _getIc() {
    logger.step('** Getting config strategy for aux chain.');
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]),
      config = rsp[oThis.auxChainId];
    oThis.ic = new InstanceComposer(config);
  }

  /**
   * Get providers from config
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  async _getProvidersFromConfig() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return responseHelper.successWithData(providers);
  }
}

module.exports = AuxGethSetup;
