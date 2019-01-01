'use strict';

/**
 * set co anchor of anchor contract
 *
 * @module tools/chainSetup/SetCoAnchor
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
  ChainSetupLogsModel = require(rootPrefix + '/app/models/mysql/ChainSetupLogs'),
  SetCoAnchorHelper = require(rootPrefix + '/tools/commonSetup/SetCoAnchor'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

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
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainKind = params['chainKind'];

    oThis.chainId = null;
    oThis.otherChainId = null;
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
          internal_error_identifier: 't_cs_sac_1',
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

    let signerAddress = await oThis._getOwnerAddr(),
      anchorContractAddress = await oThis._getAnchorContractAddr(),
      coAnchorContractAddress = await oThis._getCoAnchorContractAddr();

    let params = {
      chainId: oThis.chainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      anchorContractAddress: anchorContractAddress,
      coAnchorContractAddress: coAnchorContractAddress
    };

    let helper = new SetCoAnchorHelper(params);

    let setupRsp = await helper.perform();

    setupRsp.debugOptions = {
      inputParams: {},
      transactionParams: params
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
      case chainAddressConstants.originChainKind:
        oThis.chainId = oThis._configStrategyObject.originChainId;
        oThis.otherChainId = oThis._configStrategyObject.auxChainId;
        oThis.gasPrice = '0x3B9ACA00'; //TODO: Add dynamic gas logic here
        oThis.otherChainKind = chainAddressConstants.auxChainKind;
        break;
      case chainAddressConstants.auxChainKind:
        oThis.chainId = oThis._configStrategyObject.auxChainId;
        oThis.otherChainId = oThis._configStrategyObject.originChainId;
        oThis.gasPrice = '0x0';
        oThis.otherChainKind = chainAddressConstants.originChainKind;
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

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.ownerKind,
      chainKind: oThis.chainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_da_3',
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
  async _getAnchorContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.anchorContractKind,
      chainKind: oThis.chainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_da_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get co anchor contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getCoAnchorContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.otherChainId,
      kind: chainAddressConstants.anchorContractKind,
      chainKind: oThis.otherChainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_da_5',
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
    insertParams['stepKind'] = chainSetupLogsConstants.setCoAnchorStepKind;
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
