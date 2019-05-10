/**
 * Module to setup USDC token.
 *
 * @module tools/chainSetup/origin/usdcToken/Base
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  NonceGetForTransaction = require(rootPrefix + '/lib/nonce/get/ForTransaction'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  GasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 * Class to setup USDC token.
 *
 * @class SetupUsdcTokenBase
 */
class SetupUsdcTokenBase {
  /**
   * Constructor to setup simple token.
   *
   * @param {object} params
   * @param {string} params.signerAddress
   * @param {string} params.signerKey
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.signerAddress = params.signerAddress;
    oThis.signerKey = params.signerKey;

    oThis.web3InstanceObj = null;
    oThis.configStrategyObj = null;
    oThis.gasPrice = null;
  }

  /**
   * Perform.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    if (basicHelper.isProduction() && basicHelper.isMainSubEnvironment()) {
      return responseHelper.error({
        internal_error_identifier: 't_cs_o_ut_b_1',
        api_error_identifier: 'action_prohibited_in_prod_main',
        debug_options: {}
      });
    }

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('tools/chainSetup/origin/usdcToken/Base::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 't_cs_o_ut_b_2',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Config strategy.
   *
   * @return {object}
   */
  get configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy klass.
   *
   * @sets oThis.configStrategyObj
   *
   * @return {object}
   */
  get configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) {
      return oThis.configStrategyObj;
    }
    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }

  /**
   * Get web3instance to interact with chain.
   *
   * @sets oThis.web3InstanceObj
   *
   * @return {object}
   */
  get web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) {
      return oThis.web3InstanceObj;
    }

    const chainEndpoint = oThis.configStrategyObject.originChainRpcProvider('readWrite');

    oThis.web3InstanceObj = web3Provider.getInstance(chainEndpoint).web3WsProvider;

    return oThis.web3InstanceObj;
  }

  /**
   * Set gas price.
   *
   * @sets oThis.gasPrice
   *
   * @return {Promise<void>}
   */
  async setGasPrice() {
    const oThis = this;

    const gasPriceCacheObj = new GasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.gasPrice = gasPriceRsp.data;
  }

  /**
   * Add signer key to wallet.
   */
  addKeyToWallet() {
    const oThis = this;

    oThis.web3Instance.eth.accounts.wallet.add(oThis.signerKey);
  }

  /**
   * Remove signer key from wallet.
   */
  removeKeyFromWallet() {
    const oThis = this;

    oThis.web3Instance.eth.accounts.wallet.remove(oThis.signerKey);
  }

  /**
   * Fetch nonce (calling this method means incrementing nonce in cache, use judiciously).
   *
   * @param {string} address
   *
   * @return {Promise}
   */
  async fetchNonce(address) {
    const oThis = this;

    return new NonceGetForTransaction({
      address: address,
      chainId: oThis.configStrategyObject.originChainId
    }).getNonce();
  }

  /**
   * Insert entry into chain setup logs table.
   *
   * @ignore
   *
   * @param {string} step
   * @param {object} response
   *
   * @return {Promise<void>}
   */
  async _insertIntoChainSetupLogs(step, response) {
    const oThis = this;

    const insertParams = {};

    insertParams.chainId = oThis.configStrategyObject.originChainId;
    insertParams.chainKind = coreConstants.originChainKind;
    insertParams.stepKind = step;
    insertParams.debugParams = response.debugOptions;
    insertParams.transactionHash = response.data.transactionHash;

    if (response.isSuccess()) {
      insertParams.status = chainSetupConstants.successStatus;
    } else {
      insertParams.status = chainSetupConstants.failureStatus;
      insertParams.debugParams.errorResponse = response.toHash();
    }

    await new ChainSetupLogModel().insertRecord(insertParams);

    return responseHelper.successWithData({});
  }
}

InstanceComposer.registerAsShadowableClass(SetupUsdcTokenBase, coreConstants.icNameSpace, 'SetupUsdcTokenBase');

module.exports = SetupUsdcTokenBase;
