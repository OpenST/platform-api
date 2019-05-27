/**
 * Module for base class for shared models.
 *
 * @module app/models/ddb/shared/Base
 */

const rootPrefix = '../../../..',
  BaseModel = require(rootPrefix + '/app/models/ddb/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/providers/storage');

/**
 * Class for base class of shared models.
 *
 * @class SharedBaseKlass
 */
class SharedBaseKlass extends BaseModel {
  /**
   * Constructor for base class of shared models.
   *
   * @param {object} params
   * @param {number} params.consistentRead: (1,0)
   *
   * @augments BaseModel
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this,
      storageProvider = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'storageProvider'),
      ostStorage = storageProvider.getInstance(storageConstants.shared);

    oThis.ddbServiceObj = ostStorage.dynamoDBService;

    oThis.shardHelper = new ostStorage.model.DynamodbShardHelper({
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
}

module.exports = SharedBaseKlass;
