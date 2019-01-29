'use strict';
/**
 * Deploy CoGateway contract
 *
 * @module tools/chainSetup/origin/DeployCoGateway
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
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  DeployCoGatewayHelper = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/DeployCoGateway'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

/**
 * Class for CoGateway deployment
 *
 * @class
 */
class DeployCoGateway {
  /**
   * Constructor for CoGateway deployment
   *
   * @param {Object} params
   * @param {String} params.auxChainId - auxChainId for which origin-gateway needs be deployed.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];

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
          internal_error_identifier: 't_cs_o_dcg_1',
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
      organizationAddress = await oThis._getOrganizationAddr(),
      simpleTokenContractAddress = await oThis._getSimpleTokenContractAddr(),
      stPrimeContractAddress = await oThis._getSTPrimeContractAddr(),
      anchorAddress = await oThis._getAnchorAddr(),
      gatewayAddress = await oThis._getGatewayContractAddr(),
      messageBusLibAddress = await oThis._getMessageBusLibAddr(),
      gatewayLibAddress = await oThis._getGatewayLibAddr();

    let params = {
      chainId: oThis.chainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainRpcProvider(oThis.chainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      organizationAddress: organizationAddress,
      originContractAddress: simpleTokenContractAddress,
      auxContractAddress: stPrimeContractAddress,
      anchorAddress: anchorAddress,
      gatewayAddress: gatewayAddress,
      messageBusLibAddress: messageBusLibAddress,
      gatewayLibAddress: gatewayLibAddress
    };

    let deployHelper = new DeployCoGatewayHelper(params);

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
   * init vars
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.chainId = oThis._configStrategyObject.auxChainId;
    oThis.chainKind = coreConstants.auxChainKind;
    oThis.gasPrice = contractConstants.zeroGasPrice;
  }

  /***
   *
   * Get deployer addr
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
          internal_error_identifier: 't_cs_o_dcg_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * Get org contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getOrganizationAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.baseContractOrganizationKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * Get simple token contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getSimpleTokenContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.baseContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * Get simple token prime contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getSTPrimeContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.baseContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_5',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * Get anchor contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getAnchorAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.auxAnchorContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_6',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * Get gateway contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getGatewayContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis._configStrategyObject.originChainId,
      kind: chainAddressConstants.originGatewayContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_9',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * Get message bus lib addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getMessageBusLibAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.messageBusLibKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_7',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get gateway bus lib addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getGatewayLibAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.gatewayLibKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_8',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
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
    insertParams['stepKind'] = chainSetupLogsConstants.deployCoGatewayStepKind;
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
      chainId: oThis.chainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.auxCoGatewayContractKind,
      chainKind: oThis.chainKind,
      address: response.data['contractAddress']
    });
  }

  /**
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy klass
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(DeployCoGateway, coreConstants.icNameSpace, 'DeployCoGateway');

module.exports = DeployCoGateway;
