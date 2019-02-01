'use strict';

/**
 * setup simpleToken Base
 *
 * @module tools/chainSetup/origin/simpleToken/Base
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class SetupSimpleTokenBase {
  /**
   * Constructor
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.signerAddress = params['signerAddress'];
    oThis.signerKey = params['signerKey'];

    oThis.web3InstanceObj = null;
    oThis.configStrategyObj = null;
    oThis.gasPrice = null;
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

    if (basicHelper.isProduction() && basicHelper.isMainSubEnvironment()) {
      return responseHelper.error({
        internal_error_identifier: 't_cs_o_st_b_2',
        api_error_identifier: 'action_prohibited_in_prod_main',
        debug_options: {}
      });
    }

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('tools/chainSetup/origin/simpleToken/Base::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_cs_o_st_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);
    return oThis.configStrategyObj;
  }

  /***
   *
   * get web3instance to interact with chain
   *
   * @return {Object}
   */
  get web3Instance() {
    const oThis = this;
    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;
    const chainEndpoint = oThis.configStrategyObject.originChainWsProvider('readWrite');
    oThis.web3InstanceObj = web3Provider.getInstance(chainEndpoint).web3WsProvider;
    return oThis.web3InstanceObj;
  }

  async setGasPrice() {
    const oThis = this;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();
    oThis.gasPrice = gasPriceRsp.data;
  }

  addKeyToWallet() {
    const oThis = this;
    oThis.web3Instance.eth.accounts.wallet.add(oThis.signerKey);
  }

  removeKeyFromWallet() {
    const oThis = this;
    oThis.web3Instance.eth.accounts.wallet.remove(oThis.signerKey);
  }

  /**
   * fetch nonce (calling this method means incrementing nonce in cache, use judiciouly)
   *
   * @ignore
   *
   * @param {string} address
   *
   * @return {Promise}
   */
  async fetchNonce(address) {
    const oThis = this;

    return new NonceManager({
      address: address,
      chainId: oThis.configStrategyObject.originChainId
    }).getNonce();
  }

  /**
   * Insert entry into chain setup logs table.
   *
   * @ignore
   *
   * @param step
   * @param response
   *
   * @return {Promise<void>}
   */
  async _insertIntoChainSetupLogs(step, response) {
    const oThis = this;

    let insertParams = {};

    insertParams['chainId'] = oThis.configStrategyObject.originChainId;
    insertParams['chainKind'] = coreConstants.originChainKind;
    insertParams['stepKind'] = step;
    insertParams['debugParams'] = response.debugOptions;
    insertParams['transactionHash'] = response.data.transactionHash;

    if (response.isSuccess()) {
      insertParams['status'] = chainSetupConstants.successStatus;
    } else {
      insertParams['status'] = chainSetupConstants.failureStatus;
      insertParams['debugParams']['errorResponse'] = response.toHash();
    }

    await new ChainSetupLogModel().insertRecord(insertParams);

    return responseHelper.successWithData({});
  }

  /***
   *
   * get simple token contract addr
   *
   * @return {Promise}
   *
   */
  async getSimpleTokenContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.configStrategyObject.originChainId,
      kind: chainAddressConstants.baseContractKind
    });

    return fetchAddrRsp.data['address'];
  }
}

InstanceComposer.registerAsShadowableClass(SetupSimpleTokenBase, coreConstants.icNameSpace, 'SetupSimpleTokenBase');

module.exports = SetupSimpleTokenBase;
