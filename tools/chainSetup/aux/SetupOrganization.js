'use strict';

/**
 * setup simpleToken Base
 *
 * @module tools/chainSetup/origin/simpleToken/Base
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainSetupLogsModel = require(rootPrefix + '/app/models/mysql/ChainSetupLogs'),
  SetupOrganization = require(rootPrefix + '/tools/commonSetup/SetupOrganization'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

/**
 *
 * @class
 */
class SetupAuxOrganization {
  /**
   * Constructor
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

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
          internal_error_identifier: 't_cs_a_stp_do_1',
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

    let signerAddress = await oThis._getDeployerAddr(),
      ownerAddress = await oThis._getOwnerAddr(),
      adminAddress = await oThis._getAdminAddr(),
      workerAddresses = await oThis._getWorkerAddresses();

    let setupOrganization = new SetupOrganization({
      chainId: oThis._auxChainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis._auxChainEndpoint,
      gasPrice: '0x0',
      ownerAddress: ownerAddress,
      adminAddress: adminAddress,
      workerAddresses: workerAddresses
    });

    let setupRsp = await setupOrganization.perform();

    setupRsp.debugOptions = {
      inputParams: {},
      transactionParams: {
        signerAddress: oThis.signerAddress,
        chainId: oThis._auxChainId,
        ownerAddress: ownerAddress,
        adminAddress: adminAddress,
        workerAddresses: workerAddresses
      }
    };

    await oThis._insertIntoChainSetupLogs(setupRsp);

    await oThis._insertIntoChainAddress(setupRsp);

    return setupRsp;
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
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.deployerKind,
      chainKind: chainAddressConstants.auxChainKind
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
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.baseContractOwnerKind,
      chainKind: chainAddressConstants.auxChainKind
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
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.baseContractAdminKind,
      chainKind: chainAddressConstants.auxChainKind
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
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.workerKind,
      chainKind: chainAddressConstants.auxChainKind
    });
    console.log('fetchAddrRsp', fetchAddrRsp.data);
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

    insertParams['chainId'] = oThis._auxChainId;
    insertParams['chainKind'] = chainSetupLogsConstants.originChainKind;
    insertParams['stepKind'] = chainSetupLogsConstants.setupOrganizationStepKind;
    insertParams['debugParams'] = response.debugOptions;
    insertParams['transactionHash'] = response.data.transactionHash;

    if (response.isSuccess()) {
      insertParams['status'] = chainSetupLogsConstants.successStatus;
    } else {
      insertParams['status'] = chainSetupLogsConstants.failureStatus;
      insertParams['debugParams']['errorResponse'] = response.toHash();
    }

    await new ChainSetupLogsModel().insertRecord(insertParams);

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
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.organizationKind,
      chainKind: chainAddressConstants.auxChainKind
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

  get _auxChainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }

  get _auxChainEndpoint() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainWsProvider('readWrite');
  }
}

InstanceComposer.registerAsShadowableClass(SetupAuxOrganization, coreConstants.icNameSpace, 'SetupAuxOrganization');

module.exports = SetupAuxOrganization;
