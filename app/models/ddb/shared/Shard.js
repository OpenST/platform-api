'use strict';

const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  Base = require(rootPrefix + '/app/models/ddb/shared/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  util = require(rootPrefix + '/lib/util');

const InstanceComposer = OSTBase.InstanceComposer;

class Shard extends Base {
  constructor(params) {
    super(params);
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{entityKind: string, shardNumber: string, isAvailableForAllocation: string}}
   */
  get longToShortNamesMap() {
    const oThis = this;

    return {
      entityKind: 'ek',
      shardNumber: 'sno',
      isAvailableForAllocation: 'iafa'
    };
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {Object|*}
   */
  get shortToLongNamesMap() {
    const oThis = this;

    return util.invert(oThis.longToShortNamesMap);
  }

  /**
   * Returns the table name.
   *
   * @returns {String}
   */
  tableName() {
    return this.tablePrefix + 'shards';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForEntityKind = oThis.shortNameFor('entityKind'),
      shortNameForShardNumber = oThis.shortNameFor('shardNumber');

    return (
      'attribute_not_exists(' + shortNameForEntityKind + ') AND attribute_not_exists(' + shortNameForShardNumber + ')'
    );
  }

  /**
   * Primary key of the table.
   *
   * @param params
   * @returns {Object}
   * @private
   */
  _keyObj(params) {
    const oThis = this,
      keyObj = {};

    keyObj[oThis.shortNameFor('entityKind')] = { S: params['entityKind'].toLowerCase() };
    keyObj[oThis.shortNameFor('shardNumber')] = { N: params['shardNumber'].toString() };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {Object}
   */
  tableSchema() {
    const oThis = this,
      tableSchema = {
        TableName: oThis.tableName(),
        KeySchema: [
          {
            AttributeName: oThis.shortNameFor('entityKind'),
            KeyType: 'HASH'
          }, //Partition key
          {
            AttributeName: oThis.shortNameFor('shardNumber'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('entityKind'), AttributeType: 'S' },
          { AttributeName: oThis.shortNameFor('shardNumber'), AttributeType: 'N' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1
        },
        SSESpecification: {
          Enabled: false
        }
      };

    return tableSchema;
  }

  /**
   * Gets list of shards which are available for allocation
   *
   * @returns {Object}
   */
  async getAvailableShards() {
    const oThis = this,
      shortNameForIsAvailable = oThis.shortNameFor('isAvailableForAllocation'),
      shortNameForEntityKind = oThis.shortNameFor('entityKind'),
      shortNameForShardNumber = oThis.shortNameFor('shardNumber'),
      dataTypeForEntityKind = oThis.shortNameToDataType[shortNameForEntityKind],
      dataTypeForShardNumber = oThis.shortNameToDataType[shortNameForShardNumber],
      availableShards = {};

    let queryParams = {
      TableName: oThis.tableName(),
      FilterExpression: `${shortNameForIsAvailable} = :iafa`,
      ExpressionAttributeValues: {
        ':iafa': { BOOL: true }
      },
      ConsistentRead: oThis.consistentRead
    };

    let response = await oThis.ddbServiceObj.scan(queryParams);

    if (response.isFailure()) {
      return response;
    }

    if (!response.data.Items || !response.data.Items[0]) {
      return Promise.resolve(responseHelper.successWithData(availableShards));
    }

    let row, entityKind, shardNumber;

    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      entityKind = row[shortNameForEntityKind][dataTypeForEntityKind];
      shardNumber = row[shortNameForShardNumber][dataTypeForShardNumber];
      if (!availableShards[entityKind]) {
        availableShards[entityKind] = [];
      }
      availableShards[entityKind].push(shardNumber);
    }

    return Promise.resolve(responseHelper.successWithData(availableShards));
  }

  /**
   * Gets list of shards which are available for allocation
   *
   * @returns {Object}
   */
  async getAvailableShardsOf(entityKind) {
    const oThis = this,
      shortNameForIsAvailable = oThis.shortNameFor('isAvailableForAllocation'),
      shortNameForEntityKind = oThis.shortNameFor('identifier'),
      dataTypeForEntityKind = oThis.shortNameToDataType[shortNameForEntityKind];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForEntityKind} = :id`,
      FilterExpression: `${shortNameForIsAvailable} = :iafa`,
      ExpressionAttributeValues: {
        ':ek': { [dataTypeForEntityKind]: entityKind },
        ':iafa': { BOOL: true }
      }
    };

    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    return Promise.resolve(response);
  }
}

InstanceComposer.registerAsShadowableClass(Shard, coreConstants.icNameSpace, 'ShardModel');

module.exports = Shard;
