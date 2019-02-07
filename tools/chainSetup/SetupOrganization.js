'use strict';

/**
 * setup organization for anchor contract
 *
 * @module tools/chainSetup/SetupAnchorOrganization
 */
const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  SetupOrganizationHelper = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/SetupOrganization'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class SetupOrganization {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.chainKind - origin / aux (chain kind for which anchor org is to be setup)
   * @param {String} params.addressKind - baseContractOrganization / anchorOrganization
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainKind = params['chainKind'];
    oThis.addressKind = params['addressKind'];

    oThis.chainId = null;
    oThis.gasPrice = null;
    oThis.configStrategyObj = null;
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
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_cs_so_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._getAddresses();

    let params = {
      chainId: oThis.chainId,
      signerAddress: oThis.signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      ownerAddress: oThis.ownerAddress,
      adminAddress: oThis.adminAddress,
      workerAddresses: oThis.workerAddresses,
      gas: contractConstants.setupOrganizationGas
    };

    let setupOrganizationHelper = new SetupOrganizationHelper(params);

    let setupRsp = await setupOrganizationHelper.perform();

    setupRsp.debugOptions = {
      inputParams: {},
      processedParams: params
    };

    await oThis._insertIntoChainSetupLogs(setupRsp);

    await oThis._insertIntoChainAddress(setupRsp);

    return setupRsp;
  }

  /***
   *
   * init vars on the basis of chain kind
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;

    switch (oThis.chainKind) {
      case coreConstants.originChainKind:
        oThis.chainId = oThis._configStrategyObject.originChainId;
        oThis.associatedAuxChainId = 0;
        oThis.deployerAddressKind = chainAddressConstants.originDeployerKind;

        let gasPriceCacheObj = new gasPriceCacheKlass(),
          gasPriceRsp = await gasPriceCacheObj.fetch();
        oThis.gasPrice = gasPriceRsp.data;
        break;
      case coreConstants.auxChainKind:
        oThis.chainId = oThis._configStrategyObject.auxChainId;
        oThis.associatedAuxChainId = oThis.chainId;
        oThis.deployerAddressKind = chainAddressConstants.auxDeployerKind;

        oThis.gasPrice = contractConstants.zeroGasPrice;
        break;
      default:
        throw `unsupported chainKind: ${oThis.chainKind}`;
    }

    switch (oThis.addressKind) {
      case chainAddressConstants.stOrgContractKind:
        oThis.stepKind = chainSetupLogsConstants.setupBaseContractOrganizationStepKind;
        oThis.ownerAddressKind = chainAddressConstants.stOrgContractOwnerKind;
        oThis.adminAddressKind = chainAddressConstants.stOrgContractAdminKind;
        oThis.workerAddressesKind = chainAddressConstants.stOrgContractWorkerKind;
        break;
      case chainAddressConstants.stPrimeOrgContractKind:
        oThis.stepKind = chainSetupLogsConstants.setupBaseContractOrganizationStepKind;
        oThis.ownerAddressKind = chainAddressConstants.stPrimeOrgContractOwnerKind;
        oThis.adminAddressKind = chainAddressConstants.stPrimeOrgContractAdminKind;
        oThis.workerAddressesKind = chainAddressConstants.stPrimeOrgContractWorkerKind;
        break;
      case chainAddressConstants.originAnchorOrgContractKind:
        oThis.stepKind = chainSetupLogsConstants.setupAnchorOrganizationStepKind;
        oThis.ownerAddressKind = chainAddressConstants.originAnchorOrgContractOwnerKind;
        oThis.adminAddressKind = chainAddressConstants.originAnchorOrgContractAdminKind;
        oThis.workerAddressesKind = chainAddressConstants.originAnchorOrgContractWorkerKind;
        break;
      case chainAddressConstants.auxAnchorOrgContractKind:
        oThis.stepKind = chainSetupLogsConstants.setupAnchorOrganizationStepKind;
        oThis.ownerAddressKind = chainAddressConstants.auxAnchorOrgContractOwnerKind;
        oThis.adminAddressKind = chainAddressConstants.auxAnchorOrgContractAdminKind;
        oThis.workerAddressesKind = chainAddressConstants.auxAnchorOrgContractWorkerKind;
        break;
      default:
        throw `unsupported addressKind: ${oThis.addressKind}`;
    }
  }

  /**
   * Fetch necessary addresses.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _getAddresses() {
    const oThis = this;

    // Fetch all addresses associated with mentioned chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.associatedAuxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_so_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.signerAddress = chainAddressesRsp.data[oThis.deployerAddressKind].address;
    oThis.ownerAddress = chainAddressesRsp.data[oThis.ownerAddressKind].address;
    oThis.adminAddress = chainAddressesRsp.data[oThis.adminAddressKind].address;
    oThis.workerAddresses = [];

    let workerAddressEntities = chainAddressesRsp.data[oThis.workerAddressesKind];

    for (let i = 0; i < workerAddressEntities.length; i++) {
      oThis.workerAddresses.push(workerAddressEntities[i].address);
    }
  }

  /**
   * Insert entry into chain setup logs table.
   *
   * @private
   *
   * @param response
   *
   * @return {Promise<Result>}
   */
  async _insertIntoChainSetupLogs(response) {
    const oThis = this;

    let insertParams = {};

    insertParams['chainId'] = oThis.chainId;
    insertParams['chainKind'] = oThis.chainKind;
    insertParams['stepKind'] = oThis.stepKind;
    insertParams['debugParams'] = response.debugOptions;
    insertParams['transactionHash'] = response.data.transactionHash;

    if (response.isSuccess()) {
      insertParams['status'] = chainSetupLogsConstants.successStatus;
    } else {
      insertParams['status'] = chainSetupLogsConstants.failureStatus;
      insertParams['debugParams']['errorResponse'] = response.toHash();
    }

    await new ChainSetupLogModel().insertRecord(insertParams);

    return responseHelper.successWithData({});
  }

  /***
   *
   * insert organization contract address into chain address
   *
   * @param {Result} response
   *
   * @return {Promise}
   *
   * @private
   */
  async _insertIntoChainAddress(response) {
    const oThis = this;

    if (response.isFailure()) return response;

    await new ChainAddressModel().insertAddress({
      address: response.data['contractAddress'],
      associatedAuxChainId: oThis.associatedAuxChainId,
      addressKind: oThis.addressKind,
      deployedChainId: oThis.chainId,
      deployedChainKind: oThis.chainKind,
      status: chainAddressConstants.activeStatus
    });

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: oThis.associatedAuxChainId }).clear();
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(SetupOrganization, coreConstants.icNameSpace, 'SetupOrganization');

module.exports = SetupOrganization;
