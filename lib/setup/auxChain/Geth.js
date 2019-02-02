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
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses');

const sealerPassword = 'testtest';

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

    logger.step('** Auxiliary addresses generation');
    let generatedAddresses = await oThis.generateAuxAddresses(),
      allocAddressToAmountMap = {};

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

    allocAddressToAmountMap[chainOwnerAddress] = coreConstants.OST_AUX_STPRIME_TOTAL_SUPPLY;

    logger.step('** init GETH with genesis');
    let initChainRes = await gethManager.initChain(
      coreConstants.auxChainKind,
      oThis.auxChainId,
      sealerPassword,
      allocAddressToAmountMap
    );

    logger.step('** Starting Auxiliary GETH for deployment.');
    await serviceManager.startGeth(
      coreConstants.auxChainKind,
      oThis.auxChainId,
      'deployment',
      initChainRes.sealerAddress,
      sealerPassword
    );

    // TODO - add GETH checker
    await basicHelper.pauseForMilliSeconds(5000);

    logger.step('* Stopping auxiliary GETH.');
    await serviceManager.stopAuxGeth(oThis.auxChainId);

    logger.step('** Starting Auxiliary GETH with non-zero gas price.');
    await serviceManager.startGeth(coreConstants.auxChainKind, oThis.auxChainId, '');

    await basicHelper.pauseForMilliSeconds(5000);

    logger.step('* Stopping auxiliary GETH.');
    await serviceManager.stopAuxGeth(oThis.auxChainId);

    return generatedAddresses;
  }

  async _getIc() {
    logger.step('** Getting config strategy for aux chain.');
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]),
      config = rsp[oThis.auxChainId];
    oThis.ic = new InstanceComposer(config);
  }

  /**
   * Generate auxiliary chain addresses.
   *
   * @return {Promise<*>}
   */
  async generateAuxAddresses() {
    const oThis = this;
    let generateChainKnownAddressObj = new GenerateChainKnownAddresses({
      addressKinds: [
        chainAddressConstants.auxDeployerKind,
        chainAddressConstants.interChainFacilitatorKind,

        chainAddressConstants.stPrimeOrgContractOwnerKind,
        chainAddressConstants.auxAnchorOrgContractOwnerKind,
        chainAddressConstants.auxPriceOracleContractOwnerKind,

        chainAddressConstants.stPrimeOrgContractAdminKind,
        chainAddressConstants.auxAnchorOrgContractAdminKind,
        chainAddressConstants.auxPriceOracleContractAdminKind,

        chainAddressConstants.stPrimeOrgContractWorkerKind,
        chainAddressConstants.auxAnchorOrgContractWorkerKind,
        chainAddressConstants.auxPriceOracleContractWorkerKind
      ],
      chainKind: coreConstants.auxChainKind,
      chainId: oThis.auxChainId
    });
    logger.log('* Generating address for deployer, owner, admin and worker for aux chain');
    let generateAuxAddrRsp = await generateChainKnownAddressObj.perform();

    if (!generateAuxAddrRsp.isSuccess()) {
      logger.error('Generating aux chain addresses failed');
      return Promise.reject();
    }

    logger.info('Generate Addresses Response: ', generateAuxAddrRsp.toHash());

    return generateAuxAddrRsp.data['addressKindToValueMap'];
  }
}

module.exports = AuxGethSetup;
