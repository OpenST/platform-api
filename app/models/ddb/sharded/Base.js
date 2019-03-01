'use strict';
/**
 * Base class for sharded models
 *
 * @module app/models/ddb/sharded/Base.js
 */
const mustache = require('mustache');

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseModel = require(rootPrefix + '/app/models/ddb/Base'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/storage');

/**
 * Class for sharded models base
 *
 * @class
 */
class ShardedBase extends BaseModel {
  /**
   * Constructor for Base class for sharded models
   *
   * @augments BaseModel
   *
   * @param {Object} params
   * @param {Number} params.shardNumber
   * @param {Number} params.consistentRead: (1,0)
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.shardNumber = params.shardNumber;

    const storageProvider = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'storageProvider');

    oThis.configStrategyObj = null;

    oThis.ostStorage = storageProvider.getInstance(storageConstants.sharded, oThis.chainId);
    oThis.ddbServiceObj = oThis.ostStorage.dynamoDBService;
  }

  /**
   * returns aux chain Id
   */
  get chainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }

  /**
   * Create shard helper object
   * @returns {*}
   */
  get shardHelper() {
    const oThis = this;

    return new oThis.ostStorage.model.DynamodbShardHelper({
      table_schema: oThis.tableSchema(),
      shard_name: oThis.tableName()
    });
  }

  /**
   * Create shard
   *
   * @returns {Promise<result>}
   */
  createTable() {
    const oThis = this;

    return oThis.shardHelper.createShard();
  }

  /**
   * Get Table name.
   *
   * @returns {String}: returns the table name by substituting the template vars in template
   */
  tableName() {
    const oThis = this,
      tableNameTemplate = oThis.tablePrefix + '' + oThis.tableNameTemplate(),
      tableNameVars = oThis.tableNameTemplateVars();

    return mustache.render(tableNameTemplate, tableNameVars);
  }

  /**
   * It should return the map whose key should be replaced in the map.
   *
   * @returns {Object}
   */
  tableNameTemplateVars() {
    const oThis = this;
    return {
      shardNumber: shardConstant.getShardSuffixFromShardNumber(oThis.shardNumber),
      chainId: oThis.chainId
    };
  }

  /**
   * It should return the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    throw 'sub class to implement';
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }
}

module.exports = ShardedBase;
