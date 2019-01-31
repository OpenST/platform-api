'use strict';
/**
 * Shard By Tokens Model.
 *
 * @module app/models/ddb/shared/ShardByToken.js
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  Base = require(rootPrefix + '/app/models/ddb/shared/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  util = require(rootPrefix + '/lib/util');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/TokenShardNumbers');

class ShardByToken extends Base {
  constructor(params) {
    /**
     * @param {Object} params
     * @param {Number} params.consistentRead: (1,0)
     *
     */
    super(params);
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{tokenId: Number, entityKind: string, shardNumber: Number}}
   */
  get longToShortNamesMap() {
    return {
      tokenId: 'ti',
      entityKind: 'ek',
      shardNumber: 'sn'
    };
  }

  /**
   * shortNameToDataType
   *
   * @return {{ti: Number, ek: String, sn: Number}}
   */
  get shortNameToDataType() {
    return {
      ti: 'N',
      ek: 'S',
      sn: 'N'
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
    const oThis = this;
    return oThis.tablePrefix + 'shard_by_tokens';
  }

  /**
   * Returns condition expression
   *
   * @returns {String}
   */
  conditionExpression() {
    const oThis = this,
      shortNameForTokenId = oThis.shortNameFor('tokenId'),
      shortNameForEntityKind = oThis.shortNameFor('entityKind');

    return 'attribute_not_exists(' + shortNameForTokenId + ') AND attribute_not_exists(' + shortNameForEntityKind + ')';
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

    keyObj[oThis.shortNameFor('tokenId')] = { N: params['tokenId'].toString() };
    keyObj[oThis.shortNameFor('entityKind')] = { S: params['entityKind'] };

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
            AttributeName: oThis.shortNameFor('tokenId'),
            KeyType: 'HASH'
          }, //Partition key
          {
            AttributeName: oThis.shortNameFor('entityKind'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('tokenId'), AttributeType: 'N' },
          { AttributeName: oThis.shortNameFor('entityKind'), AttributeType: 'S' }
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
   * insertShardByTokens - Inserts tokenId, its entity and shardNumber
   *
   * @param {Object} params
   * @param {Number} params.tokenId
   * @param {String} params.entityKind
   * @param {Number} params.shardNumber
   * @return {string}
   */
  async insertShardByTokens(params) {
    const oThis = this,
      shortNameForTokenId = oThis.shortNameFor('tokenId'),
      shortNameForEntityKind = oThis.shortNameFor('entityKind');

    let conditionalExpression =
      'attribute_not_exists(' + shortNameForEntityKind + ') AND attribute_not_exists(' + shortNameForTokenId + ')';

    return oThis.putItem(params, conditionalExpression);
  }

  /**
   * insertShardByTokens - Inserts tokenId, its entity and shardNumber
   *
   * @param {Object} params
   * @param {Number} params.tokenId
   * @param {String} params.entityKinds
   * @return {string}
   */
  async getShardNumbers(params) {
    const oThis = this;

    let keyObjArray = [];

    for (let i = 0; i < params.entityKinds.length; i++) {
      keyObjArray.push(
        oThis._keyObj({
          tokenId: params.tokenId,
          entityKind: params.entityKinds[i]
        })
      );
    }

    let response = await oThis.batchGetItem(keyObjArray, 'entityKind');

    let result = {};

    for (let i = 0; i < params.entityKinds.length; i++) {
      let entity = params.entityKinds[i];

      if (response.data.hasOwnProperty(entity)) {
        result[entity] = response.data[entity].shardNumber;
      }
    }

    return responseHelper.successWithData(result);
  }

  /**
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  async afterUpdate(params) {
    const oThis = this;

    let TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      cacheObject = new TokenShardNumbersCache({ tokenId: params.tokenId });

    await cacheObject.clear();

    return responseHelper.successWithData({});
  }
}

InstanceComposer.registerAsShadowableClass(ShardByToken, coreConstants.icNameSpace, 'ShardByToken');

module.exports = ShardByToken;
