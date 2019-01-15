'use strict';
/**
 * Deploy gateway contract
 *
 * @module tools/chainSetup/origin/DeployGateway
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../..',
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  DeployGatewayHelper = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/DeployGateway'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class DeployGateway {
  /**
   * Constructor
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
          internal_error_identifier: 't_cs_o_dg_1',
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
      messageBusLibAddress: messageBusLibAddress,
      gatewayLibAddress: gatewayLibAddress
    };

    let deployHelper = new DeployGatewayHelper(params);

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
    oThis.chainId = oThis._configStrategyObject.originChainId;
    oThis.chainKind = coreConstants.originChainKind;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();
    oThis.gasPrice = gasPriceRsp.data;
  }

  /***
   *
   * get deployer addr
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
          internal_error_identifier: 't_cs_o_dg_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get org contract addr
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
          internal_error_identifier: 't_cs_o_dg_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get simple token contract addr
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
          internal_error_identifier: 't_cs_o_dg_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get simple token prime contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getSTPrimeContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.baseContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dg_5',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get anchor contract addr
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
      kind: chainAddressConstants.originAnchorContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dg_6',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get message bus lib addr
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
          internal_error_identifier: 't_cs_o_dg_7',
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
          internal_error_identifier: 't_cs_o_dg_8',
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
    insertParams['stepKind'] = chainSetupLogsConstants.deployGatewayStepKind;
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
   * Insert gateway address and simpleStake address into chain address
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
      kind: chainAddressConstants.originGatewayContractKind,
      chainKind: oThis.chainKind,
      address: response.data['contractAddress']
    });

    await new ChainAddressModel().insertAddress({
      chainId: oThis.chainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.simpleStakeContractKind,
      chainKind: oThis.chainKind,
      address: response.data[chainAddressConstants.simpleStakeContractKind]
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

InstanceComposer.registerAsShadowableClass(DeployGateway, coreConstants.icNameSpace, 'DeployGateway');

module.exports = DeployGateway;
