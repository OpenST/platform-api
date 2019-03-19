'use strict';
/**
 * Deploy Pricer Rule contract
 *
 * @module lib/setup/economy/RegisterPricerRule
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  tokenRuleConstants = require(rootPrefix + '/lib/globalConstant/tokenRule'),
  TokenRuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenRule'),
  TokenRuleModel = require(rootPrefix + '/app/models/mysql/TokenRule');

const OpenSTJs = require('@openst/openst.js');

/**
 * Class for Token Holder Master Copy deployment
 *
 * @class
 */
class RegisterPricerRule {
  /**
   * Constructor for Token Holder Master Copy deployment
   *
   * @param {Object} params
   * @param {Number} params.tokenId: token id
   * @param {String} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.auxChainId = params['auxChainId'];
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

    oThis.gasPrice = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.configStrategyObj = null;

    oThis.auxWorkerAddress = null;
    oThis.tokenRulesAddress = null;
    oThis.pricerRuleAddress = null;
    oThis.pricerRuleAbi = null;
  }

  /**
   * Performer
   *
   * @return {Promise<result>}
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
          internal_error_identifier: 'l_s_e_rpr_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error.toString() }
        });
      }
    });
  }

  /**
   * Async performer
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._setAddresses();

    await oThis._setWeb3Instance();

    let submitTxRsp = await oThis._registerPricerRule();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskPending,
      transactionHash: submitTxRsp.data['transactionHash'],
      debugParams: {
        tokenRulesAddress: oThis.tokenRulesAddress,
        pricerRuleAddress: oThis.pricerRuleAddress,
        auxWorkerAddress: oThis.auxWorkerAddress
      }
    });
  }

  /**
   * Initialize required variables.
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');
    oThis.gasPrice = contractConstants.auxChainGasPrice;
  }

  /**
   * Get addresses
   *
   * @private
   *
   * @return {Promise}
   */
  async _setAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (getAddrRsp.isFailure() || !getAddrRsp.data) {
      return Promise.reject(getAddrRsp);
    }

    oThis.auxWorkerAddress = getAddrRsp.data[tokenAddressConstants.auxWorkerAddressKind][0];
    oThis.tokenRulesAddress = getAddrRsp.data[tokenAddressConstants.tokenRulesContractKind];

    if (!oThis.auxWorkerAddress || !oThis.tokenRulesAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_rpr_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenRulesAddress: oThis.tokenRulesAddress,
            auxWorkerAddress: oThis.auxWorkerAddress
          }
        })
      );
    }

    await oThis._setPricerRuleAddress();
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.auxWeb3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   *
   * @return {Promise<never>}
   * @private
   */
  async _setPricerRuleAddress() {
    const oThis = this,
      fetchPricerRuleRsp = await RuleModel.getPricerRuleDetails();

    oThis.pricerRuleAbi = JSON.stringify(fetchPricerRuleRsp.data.abi);

    let ruleId = fetchPricerRuleRsp.data.id;

    let tokenRulesRsp = await new TokenRuleCache({
      tokenId: oThis.tokenId,
      ruleId: ruleId
    }).fetch();

    if (
      tokenRulesRsp.isFailure() ||
      !tokenRulesRsp.data ||
      !tokenRulesRsp.data.address ||
      tokenRulesRsp.data.status != tokenRuleConstants.invertedStatuses[tokenRuleConstants.createdStatus]
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_rpr_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { tokenRulesRsp: tokenRulesRsp.data }
        })
      );
    }

    oThis.pricerRuleAddress = tokenRulesRsp.data.address;

    await new TokenRuleModel().updateStatus(oThis.tokenId, ruleId, tokenRuleConstants.registeringStatus);
  }

  /**
   * Deploy contract
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _registerPricerRule() {
    const oThis = this;

    let OpenSTJsTokenRulesHelpers = OpenSTJs.Helpers.TokenRules,
      openSTJsTokenRulesHelpers = new OpenSTJsTokenRulesHelpers(oThis.tokenRulesAddress, oThis.auxWeb3Instance);

    let txOptions = {
      from: oThis.auxWorkerAddress,
      to: oThis.tokenRulesAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.registerPricerRuleGas,
      value: contractConstants.zeroValue
    };

    let txObject = await openSTJsTokenRulesHelpers._registerRuleRawTx(
      ruleConstants.pricerRuleName,
      oThis.pricerRuleAddress,
      oThis.pricerRuleAbi
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.registerPricerRuleKind,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return submitTxRsp;
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
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

InstanceComposer.registerAsShadowableClass(RegisterPricerRule, coreConstants.icNameSpace, 'RegisterPricerRule');

module.exports = {};
