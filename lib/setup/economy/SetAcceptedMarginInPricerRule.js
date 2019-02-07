'use strict';
/**
 * Sets an acceptance margin for the base currency price per pay currency
 *
 *
 * @module lib/setup/economy/SetAcceptedMarginInPricerRule
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  RuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Rule'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  TokenRuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenRule'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

const OpenStJs = require('@openstfoundation/openst.js');

/**
 * Class for set accepted margin in pricer rule
 *
 * @class
 */
class SetAcceptedMarginInPricerRule {
  /**
   * Constructor for set accepted margin in pricer rule
   *
   * @param {Object} params
   * @param {String} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params['tokenId'];
    oThis.auxChainId = params['auxChainId'];
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

    oThis.gasPrice = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.configStrategyObj = null;
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
          internal_error_identifier: 'l_s_e_samipr_1',
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

    oThis._initializeVars();

    await oThis._setAddresses();

    await oThis._setWeb3Instance();

    let submitTxRsp = await oThis._deployContract();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        taskResponseData: {
          pricerRuleAddress: oThis.pricerRuleAddress,
          auxWorkerAddress: oThis.auxWorkerAddr
        }
      })
    );
  }

  /**
   * Initialize required variables.
   *
   * @private
   */
  _initializeVars() {
    const oThis = this;

    oThis.gasPrice = contractConstants.auxChainGasPrice;
  }

  /**
   * Set addresses required for adding price oracle address in pricer rule.
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let tokenAddressesCacheRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenAddressesCacheRsp.isFailure() || !tokenAddressesCacheRsp.data) {
      return Promise.reject(tokenAddressesCacheRsp);
    }

    logger.debug('tokenAddressesCacheRsp-----', tokenAddressesCacheRsp);

    oThis.auxWorkerAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.auxWorkerAddressKind][0];

    if (!oThis.auxWorkerAddr) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_samipr_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            auxWorkerAddress: oThis.auxWorkerAddr
          }
        })
      );
    }

    await oThis._getPricerRuleAddr();
  }

  /**
   * Get pricer rule contract address from table
   *
   * @private
   *
   * @return {Promise}
   */
  async _getPricerRuleAddr() {
    const oThis = this;

    // Fetch from cache
    let ruleCache = new RuleCache({ tokenId: 0, name: ruleConstants.pricerRuleName }),
      ruleCacheRsp = await ruleCache.fetch();

    if (ruleCacheRsp.isFailure() || !ruleCacheRsp.data) {
      return Promise.reject(ruleCacheRsp);
    }

    logger.debug('ruleCacheRsp-------', ruleCacheRsp);

    let tokenRuleCache = new TokenRuleCache({ tokenId: oThis.tokenId, ruleId: ruleCacheRsp.data.id }),
      tokenRuleCacheRsp = await tokenRuleCache.fetch();

    if (tokenRuleCacheRsp.isFailure() || !tokenRuleCacheRsp.data) {
      return Promise.reject(tokenRuleCacheRsp);
    }

    logger.debug('tokenRuleCacheRsp-------', tokenRuleCacheRsp);

    oThis.pricerRuleAddress = tokenRuleCacheRsp.data.address;
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;

    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');

    oThis.auxWeb3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * Deploy contract
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _deployContract() {
    const oThis = this;

    let OpenStJsPricerRuleHelper = OpenStJs.Helpers.Rules.PricerRule,
      openStJsPricerRuleHelper = new OpenStJsPricerRuleHelper(oThis.auxWeb3Instance, oThis.pricerRuleAddress);

    let txOptions = {
      from: oThis.auxWorkerAddr,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.setAcceptedMarginGas
    };

    let txObject = await openStJsPricerRuleHelper._setAcceptanceMarginRawTx(
      contractConstants.payCurrencyCode,
      contractConstants.acceptanceMargin
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return Promise.resolve(submitTxRsp);
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

InstanceComposer.registerAsShadowableClass(
  SetAcceptedMarginInPricerRule,
  coreConstants.icNameSpace,
  'SetAcceptedMarginInPricerRule'
);

module.exports = SetAcceptedMarginInPricerRule;
