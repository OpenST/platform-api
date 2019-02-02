'use strict';
/**
 * Activate gateway contract
 *
 * @module tools/chainSetup/origin/activateGateway
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  ActivateGatewayHelper = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/ActivateGateway'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 * Activate gateway.
 *
 * @class
 */
class ActivateGateway {
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
          internal_error_identifier: 't_cs_o_ag_1',
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
      gatewayAddress: oThis.gatewayContractAddress,
      coGatewayAddress: oThis.coGatewayContractAddress
    };

    let helper = new ActivateGatewayHelper(params);

    let activateRsp = await helper.perform();

    activateRsp.debugOptions = {
      inputParams: {},
      processedParams: params
    };

    await oThis._insertIntoChainSetupLogs(activateRsp);

    return activateRsp;
  }

  /**
   * Init vars
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
          internal_error_identifier: 't_cs_o_ag__2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.signerAddress = chainAddressesRsp.data[chainAddressConstants.stOrgContractOwnerKind].address;
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
          internal_error_identifier: 't_cs_o_ag__3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.gatewayContractAddress = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.coGatewayContractAddress = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
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
    insertParams['stepKind'] = chainSetupLogsConstants.activateGatewayStepKind;
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

InstanceComposer.registerAsShadowableClass(ActivateGateway, coreConstants.icNameSpace, 'ActivateGateway');

module.exports = ActivateGateway;
