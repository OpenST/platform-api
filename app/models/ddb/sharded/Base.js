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
   * @param {Number} params.chainId: chainId
   * @param {Number} params.shardNumber
   * @param {Number} params.consistentRead: (1,0)
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.shardNumber = params.shardNumber;
    oThis.chainId = params.chainId;

    const storageProvider = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'storageProvider');

    oThis.openSTStorage = storageProvider.getInstance(storageConstants.sharded, oThis.chainId);
    oThis.ddbServiceObj = oThis.openSTStorage.dynamoDBService;
  }

  /**
   * Create shard helper object
   * @returns {*}
   */
  get shardHelper() {
    const oThis = this;

    return new oThis.openSTStorage.model.ShardHelper({
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
      shardNumber: shardConstant.getShardSuffixFromShardNumber(oThis.shardNumber)
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
}

module.exports = ShardedBase;
