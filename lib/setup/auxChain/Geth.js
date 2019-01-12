'use strict';

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  gethManager = require(rootPrefix + '/tools/localSetup/gethManager'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  serviceManager = require(rootPrefix + '/tools/localSetup/serviceManager');

class AuxGethSetup {
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
        logger.error('tools/localSetup/auxChainSetup.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_ls_acs_1',
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
      allocAddressToAmountMap = {},
      chainOwnerAddr = generatedAddresses.data.addressKindToValueMap.chainOwner;
    allocAddressToAmountMap[chainOwnerAddr] = coreConstants.OST_AUX_STPRIME_TOTAL_SUPPLY;

    logger.step('** init GETH with genesis');
    await gethManager.initChain(coreConstants.auxChainKind, oThis.auxChainId, allocAddressToAmountMap);

    logger.step('** Starting Auxiliary GETH for deployment.');
    await serviceManager.startGeth(coreConstants.auxChainKind, oThis.auxChainId, 'deployment');

    // TODO - add GETH checker
    await basicHelper.pauseForMilliSeconds(5000);

    logger.step('* Stopping auxiliary geth.');
    await serviceManager.stopAuxGeth(oThis.auxChainId);

    return true;
  }

  async _getIc() {
    logger.step('** Getting config strategy for aux chain.');
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]),
      config = rsp[oThis.auxChainId];
    // TODO - check if config strategy entries are present in db.
    oThis.ic = new InstanceComposer(config);
  }

  async generateAuxAddresses() {
    const oThis = this;
    let generateChainKnownAddressObj = new GenerateChainKnownAddresses({
      addressKinds: [
        chainAddressConstants.deployerKind,
        chainAddressConstants.ownerKind,
        chainAddressConstants.adminKind,
        chainAddressConstants.chainOwnerKind,
        chainAddressConstants.workerKind
      ],
      chainKind: coreConstants.auxChainKind,
      chainId: oThis.auxChainId
    });
    logger.log('* generating address for deployer, owner, admin, chain owner and worker for aux chain');
    return await generateChainKnownAddressObj.perform();
  }
}

module.exports = AuxGethSetup;
