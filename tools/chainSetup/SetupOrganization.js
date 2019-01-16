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
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  SetupOrganizationHelper = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/SetupOrganization'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

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
          internal_error_identifier: 't_cs_sao_1',
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

    let signerAddress = await oThis._getDeployerAddr(),
      ownerAddress = await oThis._getOwnerAddr(),
      adminAddress = await oThis._getAdminAddr(),
      workerAddresses = await oThis._getWorkerAddresses();

    let params = {
      chainId: oThis.chainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      ownerAddress: ownerAddress,
      adminAddress: adminAddress,
      workerAddresses: workerAddresses
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

        let gasPriceCacheObj = new gasPriceCacheKlass(),
          gasPriceRsp = await gasPriceCacheObj.fetch();
        oThis.gasPrice = gasPriceRsp.data;
        break;
      case coreConstants.auxChainKind:
        oThis.chainId = oThis._configStrategyObject.auxChainId;
        oThis.gasPrice = contractConstants.zeroGasPrice;
        break;
      default:
        throw `unsupported chainKind: ${oThis.chainKind}`;
    }

    switch (oThis.addressKind) {
      case chainAddressConstants.baseContractOrganizationKind:
        oThis.stepKind = chainSetupLogsConstants.setupBaseContractOrganizationStepKind;
        break;
      case chainAddressConstants.anchorOrganizationKind:
        oThis.stepKind = chainSetupLogsConstants.setupAnchorOrganizationStepKind;
        break;
      default:
        throw `unsupported addressKind: ${oThis.addressKind}`;
    }
  }

  /***
   *
   * get STPrime org contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getDeployerAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.deployerKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_do_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get STPrime org contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getOwnerAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.ownerKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_do_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get STPrime org contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getAdminAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.adminKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_do_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get worker addresses
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getWorkerAddresses() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.workerKind
    });

    if (!fetchAddrRsp.data.addresses) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_do_5',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.addresses;
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
      chainId: oThis.chainId,
      kind: oThis.addressKind,
      chainKind: oThis.chainKind
    });
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
