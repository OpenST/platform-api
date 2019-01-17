'use strict';
/**
 * Insert information into economies table for view
 *
 * @module tools/economySetup/CreateEconomy
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object');

/**
 * Class for inserting information into economies table in DynamoDb
 *
 * @class
 */
class CreateEconomy {
  /**
   * Constructor for inserting information into economies table in DynamoDb
   *
   * @param {Object} params
   * @param {Number} params.tokenId
   * @param {Number} params.chainId
   * @param {String} params.simpleStakeAddress
   * @param {String} params.brandedTokenContract
   * @param {String} params.chainEndpoint
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.simpleStakeAddress = params.simpleStakeAddress;
    oThis.contractAddress = params.brandedTokenContract;
    oThis.chainEndpoint = params.chainEndpoint;
  }

  /**
   * Perform
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
          internal_error_identifier: 't_es_iiet_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   * Async performer for the class.
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._initializeVars();

    await oThis._createEntryInEconomyTable();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Fetch token details from tokens table.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    let tokenDetails = await new TokenModel()
      .select('*')
      .where(['id = ?', oThis.tokenId])
      .fire();

    if (tokenDetails.length < 1) {
      logger.error('Token does not exist.');
      return Promise.reject(); //TODO: What to do?
    }
    tokenDetails = tokenDetails[0];
    const economyTimestamp = tokenDetails.created_at;

    oThis.displayName = tokenDetails.name;
    oThis.symbol = tokenDetails.symbol;
    oThis.conversionFactor = tokenDetails.conversion_factor;
    oThis.decimals = tokenDetails.decimal;
    oThis.blockTimestamp = parseInt((new Date(economyTimestamp).getTime() / 1000).toFixed(0));

    logger.step('Fetched token details.');
  }

  /**
   * Initialize variables.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this,
      blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]),
      CreateEconomyKlass = blockScannerObj.economy.Create;

    oThis.createEconomyObject = new CreateEconomyKlass(
      oThis.chainId,
      oThis.decimals,
      oThis.contractAddress,
      oThis.simpleStakeAddress,
      oThis.chainEndpoint,
      oThis.blockTimestamp,
      oThis.displayName,
      oThis.conversionFactor,
      oThis.symbol
    );

    logger.step('Variables initialized.');
  }

  /**
   * Create entry in economy table in DynamoDB.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _createEntryInEconomyTable() {
    const oThis = this;
    let createEconomyRsp = await oThis.createEconomyObject.perform();
    logger.step('Entry created in economies table in DynamoDB.');
    logger.debug('createEconomyRsp', createEconomyRsp);
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

InstanceComposer.registerAsShadowableClass(CreateEconomy, coreConstants.icNameSpace, 'CreateEconomy');

module.exports = CreateEconomy;
