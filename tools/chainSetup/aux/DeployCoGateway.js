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
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
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

    await oThis._fetchOriginAddresses();

    await oThis._fetchAuxAddresses();

    let params = {
      chainId: oThis.chainId,
      signerAddress: oThis.signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainRpcProvider(oThis.chainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      organizationAddress: oThis.organizationAddress,
      originContractAddress: oThis.simpleTokenContractAddress,
      auxContractAddress: oThis.stPrimeContractAddress,
      anchorAddress: oThis.anchorAddress,
      gatewayAddress: oThis.gatewayAddress,
      messageBusLibAddress: oThis.messageBusLibAddress,
      gatewayLibAddress: oThis.gatewayLibAddress
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

  /**
   * Fetch required origin addresses
   *
   * @return {Promise}
   *
   * @private
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.simpleTokenContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
    oThis.gatewayAddress = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
  }

  /**
   * Fetch required aux addresses
   *
   * @return {Promise}
   *
   * @private
   */
  async _fetchAuxAddresses() {
    const oThis = this;

    // Fetch all addresses associated with aux chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.signerAddress = chainAddressesRsp.data[chainAddressConstants.auxDeployerKind].address;
    oThis.organizationAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeOrgContractKind].address;
    oThis.stPrimeContractAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeContractKind].address;
    oThis.anchorAddress = chainAddressesRsp.data[chainAddressConstants.auxAnchorContractKind].address;
    oThis.messageBusLibAddress = chainAddressesRsp.data[chainAddressConstants.auxMbLibContractKind].address;
    oThis.gatewayLibAddress = chainAddressesRsp.data[chainAddressConstants.auxGatewayLibContractKind].address;
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
      address: response.data['contractAddress'],
      associatedAuxChainId: oThis.auxChainId,
      addressKind: chainAddressConstants.auxCoGatewayContractKind,
      deployedChainId: oThis.chainId,
      deployedChainKind: oThis.chainKind,
      status: chainAddressConstants.activeStatus
    });

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }).clear();
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
