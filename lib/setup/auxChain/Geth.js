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
  serviceManager = require(rootPrefix + '/tools/localSetup/serviceManager'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  GenerateFacilitator = require(rootPrefix + '/tools/helpers/GenerateFacilitator'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses');

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
        logger.error('lib/setup/auxChain/Geth.js::perform::catch');
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
      allocAddressToAmountMap = {};

    let chainOwnerAddressRsp = await new ChainAddressModel().fetchAddress({
        chainId: oThis.originChainId,
        kind: chainAddressConstants.chainOwnerKind
      }),
      chainOwnerAddress = chainOwnerAddressRsp.data.address;

    allocAddressToAmountMap[chainOwnerAddress] = coreConstants.OST_AUX_STPRIME_TOTAL_SUPPLY;

    logger.step('** Generate Facilitator address.');
    let generateFacilitator = new GenerateFacilitator({
      auxChainId: oThis.auxChainId,
      originChainId: oThis.originChainId
    });

    await generateFacilitator.perform();

    logger.step('** init GETH with genesis');
    await gethManager.initChain(coreConstants.auxChainKind, oThis.auxChainId, allocAddressToAmountMap);

    logger.step('** Starting Auxiliary GETH for deployment.');
    await serviceManager.startGeth(coreConstants.auxChainKind, oThis.auxChainId, 'deployment');

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

  async generateAuxAddresses() {
    const oThis = this;
    let generateChainKnownAddressObj = new GenerateChainKnownAddresses({
      addressKinds: [
        chainAddressConstants.deployerKind,
        chainAddressConstants.ownerKind,
        chainAddressConstants.adminKind,
        chainAddressConstants.workerKind
      ],
      chainKind: coreConstants.auxChainKind,
      chainId: oThis.auxChainId
    });
    logger.log('* generating address for deployer, owner, admin and worker for aux chain');
    let generateAuxAddrRsp = await generateChainKnownAddressObj.perform();

    if (!generateAuxAddrRsp.isSuccess()) {
      logger.error('Generating aux chain addresses failed');
      return Promise.reject();
    }

    // Assign workerKind address to priceOracleOpsAddressKind and add address in chain addresses table.
    const priceOracleOpsAddress = generateAuxAddrRsp.data.addressKindToValueMap[chainAddressConstants.workerKind];

    await new ChainAddressModel().insertAddress({
      address: priceOracleOpsAddress,
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      chainKind: coreConstants.auxChainKind,
      kind: chainAddressConstants.priceOracleContractKind,
      status: chainAddressConstants.activeStatus
    });

    logger.info('Generate Addresses Response: ', generateAuxAddrRsp.toHash());

    return generateAuxAddrRsp.data['addressKindToValueMap'];
  }
}

module.exports = AuxGethSetup;
