'use strict';
/**
 * Inserts Pricer Rule ABI into rules table
 *
 *
 * @module lib/setup/InsertPricerAbiIntoRulesTable
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object');

const OpenStJs = require('@openstfoundation/openst.js');

/**
 * Class
 *
 * @class
 */
class InsertIntoRulesTables {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.auxChainId:
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];
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
          internal_error_identifier: 'L_s_ipairt_1',
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

    await oThis.insertIntoRulesTable();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  async insertIntoRulesTable() {
    const oThis = this;

    // AbiBinProvider of openst.js
    let OpenStJsAbiBinProvider = OpenStJs.AbiBinProvider,
      OpenStJsAbiBinProviderHelper = new OpenStJsAbiBinProvider(oThis.auxWeb3Instance);

    // get pricer abi
    const pricerAbi = OpenStJsAbiBinProviderHelper.getABI('PricerRule');

    let insertParams = {
      name: ruleConstants.pricerKind, // change later
      kind: ruleConstants.pricerKind,
      abi: pricerAbi
    };

    let queryResponse = await new RuleModel().insertRecord(insertParams);

    if (!queryResponse || !queryResponse.isSuccess()) {
      return Promise.reject(queryResponse);
    }

    return Promise.resolve(queryResponse);
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

InstanceComposer.registerAsShadowableClass(InsertIntoRulesTables, coreConstants.icNameSpace, 'InsertIntoRulesTables');

module.exports = InsertIntoRulesTables;
