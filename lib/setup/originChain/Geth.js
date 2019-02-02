'use strict';

/**
 * @fileoverview Helper class for setting up Origin GETH and funding the required addresses
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  fileManager = require(rootPrefix + '/tools/localSetup/fileManager'),
  gethManager = require(rootPrefix + '/tools/localSetup/gethManager'),
  serviceManager = require(rootPrefix + '/tools/localSetup/serviceManager'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  transferAmountOnChain = require(rootPrefix + '/tools/helpers/TransferAmountOnChain'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses');

const sealerPassword = 'testtest';

class OriginGethSetup {
  /**
   * constructor
   *
   * @constructor
   *
   * @param originChainId - origin chain id
   */
  constructor(originChainId) {
    const oThis = this;
    oThis.originChainId = originChainId;
  }

  /**
   * perform
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/originChain/Geth.js::perform::catch');
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
   * async perform
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('** Starting fresh setup');
    await fileManager.freshSetup();

    logger.step('** Generating addresses for Origin');
    let generatedAddressResponse = await oThis._generateOriginAddr();

    logger.step('** Generating sealer address on GETH and init GETH with genesis');
    let initChainRes = await gethManager.initChain(coreConstants.originChainKind, oThis.originChainId, sealerPassword);

    logger.step('** Starting origin geth for deployment.');
    await serviceManager.startGeth(
      coreConstants.originChainKind,
      oThis.originChainId,
      'deployment',
      initChainRes.sealerAddress,
      sealerPassword
    );

    logger.log('* Funding origin deployer address with ETH.');
    await oThis._fundAddressWithEth(oThis.originDeployerAddress, 0.53591);

    logger.log('* Funding origin owner address with ETH.');
    await oThis._fundAddressWithEth(oThis.stOrgContractOwnerAddress, 0.00239);

    logger.log('* Funding origin owner address with ETH.');
    await oThis._fundAddressWithEth(oThis.originAnchorOrgContractOwnerAddress, 0.00116);

    // Commented because transfer value is 0.
    // logger.log('* Funding origin admin address with ETH.');
    // await oThis._fundAddressWithEth(oThis.stOrgContractAdminAddress, 0.00000);
    //
    // logger.log('* Funding origin admin address with ETH.');
    // await oThis._fundAddressWithEth(oThis.originAnchorOrgContractAdminAddress, 0.00000);

    logger.log('* Funding origin token admin address with ETH.');
    await oThis._fundAddressWithEth(oThis.originDefaultBTOrgContractAdminAddress, 0.0024);

    logger.log('* Funding origin token worker address with ETH.');
    await oThis._fundAddressWithEth(oThis.originDefaultBTOrgContractWorkerAddress, 0.00172);

    logger.step('* Stopping origin geth.');
    await serviceManager.stopOriginGeth(oThis.originChainId);
    logger.info('** You can start geth from script in future:');

    let gethRunCommand =
      'sh ~/openst-setup/bin/origin-' + oThis.originChainId + '/origin-chain-' + oThis.originChainId + '.sh';

    logger.info('gethRunCommand:', gethRunCommand);

    return generatedAddressResponse;
  }

  /**
   * Generate origin address
   *
   * @returns {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _generateOriginAddr() {
    const oThis = this;

    let generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: [
        chainAddressConstants.originDeployerKind,
        chainAddressConstants.masterInternalFunderKind,

        chainAddressConstants.stOrgContractOwnerKind,
        chainAddressConstants.originAnchorOrgContractOwnerKind,

        chainAddressConstants.stOrgContractAdminKind,
        chainAddressConstants.originAnchorOrgContractAdminKind,

        chainAddressConstants.stOrgContractWorkerKind,
        chainAddressConstants.originAnchorOrgContractWorkerKind,

        chainAddressConstants.originDefaultBTOrgContractAdminKind,
        chainAddressConstants.originDefaultBTOrgContractWorkerKind
      ],
      chainKind: coreConstants.originChainKind,
      chainId: oThis.originChainId
    });

    logger.log('* Generating address originDeployerKind.');
    logger.log('* Generating address masterInternalFunderKind.');
    logger.log('* Generating address stOrgContractOwnerKind.');
    logger.log('* Generating address originAnchorOrgContractOwnerKind.');
    logger.log('* Generating address stOrgContractAdminKind.');
    logger.log('* Generating address originAnchorOrgContractAdminKind.');
    logger.log('* Generating address stOrgContractWorkerKind.');
    logger.log('* Generating address originAnchorOrgContractWorkerKind.');
    logger.log('* Generating address originDefaultBTOrgContractAdminKind.');
    logger.log('* Generating address originDefaultBTOrgContractWorkerKind.');

    let generateOriginAddrRsp = await generateChainKnownAddresses.perform();

    if (!generateOriginAddrRsp.isSuccess()) {
      logger.error('Generating origin chain addresses failed');
      return Promise.reject();
    }

    logger.info('Generate Addresses Response: ', generateOriginAddrRsp.toHash());

    let addresses = generateOriginAddrRsp.data['addressKindToValueMap'];

    oThis.originDeployerAddress = addresses[chainAddressConstants.originDeployerKind];

    oThis.stOrgContractOwnerAddress = addresses[chainAddressConstants.stOrgContractOwnerKind];
    oThis.originAnchorOrgContractOwnerAddress = addresses[chainAddressConstants.originAnchorOrgContractOwnerKind];

    oThis.stOrgContractAdminAddress = addresses[chainAddressConstants.stOrgContractAdminKind];
    oThis.originAnchorOrgContractAdminAddress = addresses[chainAddressConstants.originAnchorOrgContractAdminKind];

    oThis.originDefaultBTOrgContractAdminAddress = addresses[chainAddressConstants.originDefaultBTOrgContractAdminKind];
    oThis.originDefaultBTOrgContractWorkerAddress =
      addresses[chainAddressConstants.originDefaultBTOrgContractWorkerKind];

    return addresses;
  }

  /**
   * fund address with ETH
   *
   * @param address {string} - address to fund ETH to
   * @param amount {number} - amount in eth which is to be funded
   * @returns {Promise<void>}
   * @private
   */
  async _fundAddressWithEth(address, amount) {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(amount);

    await transferAmountOnChain._fundAddressWithEth(address, oThis.originChainId, provider, amountInWei);
  }

  /**
   * get providers from config
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getProvidersFromConfig() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    oThis.originChainId = configForChain.chainId;

    return responseHelper.successWithData(providers);
  }
}

module.exports = OriginGethSetup;
