'use strict';

/**
 * setup simpleToken Base
 *
 * @module tools/chainSetup/origin/simpleTokenPrime/Base
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs');

/**
 *
 * @class
 */
class SetupSTPrimeBase {
  /**
   * Constructor
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.web3InstanceObj = null;
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
          internal_error_identifier: 't_cs_o_stp_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  static get STPrimeSetupHelper() {
    return MosaicTbd.ChainSetup.OSTPrimeHelper;
  }

  /**
   * fetch nonce (calling this method means incrementing nonce in cache, use judiciouly)
   *
   * @ignore
   *
   * @return {Promise}
   */
  async _fetchNonce(address) {
    const oThis = this;
    return new NonceManager({
      address: address,
      chainId: oThis._auxChainId
    }).getNonce();
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

  /***
   *
   * get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;
    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;
    const chainEndpoint = oThis._configStrategyObject.auxChainWsProvider('readWrite');
    oThis.web3InstanceObj = web3Provider.getInstance(chainEndpoint).web3WsProvider;
    return oThis.web3InstanceObj;
  }

  get _auxChainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }

  get _originChainId() {
    const oThis = this;
    return oThis._configStrategyObject.originChainId;
  }

  /***
   *
   * @param key
   * @private
   */
  _addKeyToWallet(key) {
    const oThis = this;
    oThis._web3Instance.eth.accounts.wallet.add(key);
  }

  /***
   *
   * @param key
   * @private
   */
  _removeKeyFromWallet(key) {
    const oThis = this;
    oThis._web3Instance.eth.accounts.wallet.remove(key);
  }

  /***
   *
   * get private key from cache
   *
   * @param {String} address
   *
   * @return {String}
   */
  async _fetchPrivateKey(address) {
    const oThis = this,
      addressPrivateKeyCache = new AddressPrivateKeyCache({ address: address }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData();
    return cacheFetchRsp.data['private_key_d'];
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

    insertParams['chainId'] = oThis._auxChainId;
    insertParams['chainKind'] = coreConstants.auxChainKind;
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
}

InstanceComposer.registerAsShadowableClass(SetupSTPrimeBase, coreConstants.icNameSpace, 'SetupSTPrimeBase');

module.exports = SetupSTPrimeBase;
