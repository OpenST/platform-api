'use strict';

/**
 * deploy anchor contract
 *
 * @module tools/chainSetup/DeployAnchor
 */
const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  DeployAnchorHelper = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/DeployAnchor'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

/**
 *
 * @class
 */
class DeployAnchor {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.chainKind - origin / aux (chain kind for which anchor org is to be setup)
   * @param {String} params.auxChainId - auxChainId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainKind = params['chainKind'];

    oThis.chainId = null;
    oThis.anchorKind = null;
    oThis.auxChainId = params.auxChainId;
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
          internal_error_identifier: 't_cs_da_1',
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

    await oThis._getDeployAnchorAddresses();

    let params = {
      chainId: oThis.chainId,
      remoteChainId: oThis.remoteChainId,
      signerAddress: oThis.signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      organizationAddress: oThis.organizationAddress
    };

    let deployHelper = new DeployAnchorHelper(params);

    let setupRsp = await deployHelper.perform();

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
        oThis.anchorKind = chainAddressConstants.originAnchorContractKind;
        oThis.remoteChainId = oThis.auxChainId;
        oThis.associatedAuxChainId = 0;
        oThis.deployerKind = chainAddressConstants.originDeployerKind;
        oThis.anchorOrganizationKind = chainAddressConstants.originAnchorOrgContractKind;

        let gasPriceCacheObj = new gasPriceCacheKlass(),
          gasPriceRsp = await gasPriceCacheObj.fetch();
        oThis.gasPrice = gasPriceRsp.data;
        break;
      case coreConstants.auxChainKind:
        oThis.chainId = oThis._configStrategyObject.auxChainId;
        oThis.remoteChainId = oThis._configStrategyObject.originChainId;
        oThis.anchorKind = chainAddressConstants.auxAnchorContractKind;
        oThis.gasPrice = contractConstants.zeroGasPrice;
        oThis.associatedAuxChainId = oThis.chainId;
        oThis.deployerKind = chainAddressConstants.auxDeployerKind;
        oThis.anchorOrganizationKind = chainAddressConstants.auxAnchorOrgContractKind;

        break;
      default:
        throw `unsupported chainKind: ${oThis.chainKind}`;
    }
  }

  /**
   * Get addresses required for anchor contract deployment.
   *
   * @private
   *
   * @return {Promise}
   */
  async _getDeployAnchorAddresses() {
    const oThis = this;

    // Fetch all addresses associated with mentioned chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.associatedAuxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_da_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.signerAddress = chainAddressesRsp.data[oThis.deployerKind].address;
    oThis.organizationAddress = chainAddressesRsp.data[oThis.anchorOrganizationKind].address;
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
    insertParams['stepKind'] = chainSetupLogsConstants.deployAnchorStepKind;
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
   * insert anchor contract address into chain address
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
      associatedAuxChainId: oThis.auxChainId,
      addressKind: oThis.anchorKind,
      deployedChainId: oThis.chainId,
      deployedChainKind: oThis.chainKind,
      status: chainAddressConstants.active
    });

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }).clear();
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

InstanceComposer.registerAsShadowableClass(DeployAnchor, coreConstants.icNameSpace, 'DeployAnchor');

module.exports = DeployAnchor;
