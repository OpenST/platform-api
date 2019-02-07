'use strict';
/**
 * Set co anchor of anchor contract
 *
 * @module tools/chainSetup/SetCoAnchor
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  SetCoAnchorHelper = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/SetCoAnchor'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class SetCoAnchor {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.chainKind - origin / aux (chain kind for which anchor org is to be setup)
   * @param {Integer} params.auxChainId - auxChainId (for which aux chain, we want to set co-anchor.)
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainKind = params['chainKind'];
    oThis.auxChainId = params['auxChainId'];

    oThis.chainId = null;
    oThis.originChainId = null;
    oThis.otherChainKind = null;
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
          internal_error_identifier: 't_cs_sca_1',
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

    await oThis._getOwnerAddr();

    await oThis._getAnchorContractAddresses();

    let params = {
      chainId: oThis.chainId,
      signerAddress: oThis.signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      anchorContractAddress: oThis.anchorContractAddress,
      coAnchorContractAddress: oThis.coAnchorContractAddress,
      gas: contractConstants.setCoAnchorGas
    };

    let helper = new SetCoAnchorHelper(params);

    let setupRsp = await helper.perform();

    setupRsp.debugOptions = {
      inputParams: {},
      processedParams: params
    };

    await oThis._insertIntoChainSetupLogs(setupRsp);

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
        oThis.originChainId = oThis._configStrategyObject.originChainId;
        oThis.associatedAuxChainId = 0;
        oThis.anchorOrgContractOwnerKind = chainAddressConstants.originAnchorOrgContractOwnerKind;
        // Define anchor and co-anchor addresses here.
        oThis.anchorContractAddressKind = chainAddressConstants.originAnchorContractKind;
        oThis.coAnchorContractAddressKind = chainAddressConstants.auxAnchorContractKind;

        let gasPriceCacheObj = new gasPriceCacheKlass(),
          garPriceRsp = await gasPriceCacheObj.fetch();
        oThis.gasPrice = garPriceRsp.data;

        oThis.otherChainKind = coreConstants.auxChainKind;
        break;
      case coreConstants.auxChainKind:
        oThis.chainId = oThis.auxChainId;
        oThis.originChainId = oThis._configStrategyObject.originChainId;
        oThis.associatedAuxChainId = oThis.auxChainId;
        oThis.anchorOrgContractOwnerKind = chainAddressConstants.auxAnchorOrgContractOwnerKind;
        // Define anchor and co-anchor addresses here.
        oThis.anchorContractAddressKind = chainAddressConstants.auxAnchorContractKind;
        oThis.coAnchorContractAddressKind = chainAddressConstants.originAnchorContractKind;

        oThis.gasPrice = contractConstants.zeroGasPrice;
        oThis.otherChainKind = coreConstants.originChainKind;
        break;
      default:
        throw `unsupported chainKind: ${oThis.chainKind}`;
    }
  }

  /***
   *
   * get anchor contract's organization's owner addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getOwnerAddr() {
    const oThis = this;

    // Fetch all addresses associated with mentioned chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.associatedAuxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_sca_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.signerAddress = chainAddressesRsp.data[oThis.anchorOrgContractOwnerKind].address;
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
  async _getAnchorContractAddresses() {
    const oThis = this;

    // Fetch all addresses associated with aux chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_sca_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.anchorContractAddress = chainAddressesRsp.data[oThis.anchorContractAddressKind].address;
    oThis.coAnchorContractAddress = chainAddressesRsp.data[oThis.coAnchorContractAddressKind].address;
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
    insertParams['stepKind'] = chainSetupLogsConstants.setCoAnchorStepKind;
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

InstanceComposer.registerAsShadowableClass(SetCoAnchor, coreConstants.icNameSpace, 'SetCoAnchor');

module.exports = SetCoAnchor;
