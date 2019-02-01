'use strict';
/**
 * Shard By Tokens Model.
 *
 * @module app/models/ddb/shared/ShardByToken
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  Base = require(rootPrefix + '/app/models/ddb/shared/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
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
   * @returns {{tokenId: Number, entityKind: Number, shardNumber: Number}}
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
      ek: 'N',
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
      keyObj = {},
      tokenIdShortName = oThis.shortNameFor('tokenId'),
      entityKindShortName = oThis.shortNameFor('entityKind');

    keyObj[tokenIdShortName] = { [oThis.shortNameToDataType[tokenIdShortName]]: params['tokenId'].toString() };
    keyObj[entityKindShortName] = { [oThis.shortNameToDataType[entityKindShortName]]: params['entityKind'] };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {Object}
   */
  tableSchema() {
    const oThis = this;

    let tokenIdShortName = oThis.shortNameFor('tokenId'),
      entityKindShortName = oThis.shortNameFor('entityKind');

    const tableSchema = {
      TableName: oThis.tableName(),
      KeySchema: [
        {
          AttributeName: tokenIdShortName,
          KeyType: 'HASH'
        }, //Partition key
        {
          AttributeName: entityKindShortName,
          KeyType: 'RANGE'
        } //Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: tokenIdShortName, AttributeType: oThis.shortNameToDataType[tokenIdShortName] },
        { AttributeName: entityKindShortName, AttributeType: oThis.shortNameToDataType[entityKindShortName] }
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

    return oThis.putItem(ShardByToken.sanitizeParamsForQuery(params), conditionalExpression);
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
      let entityKind = shardConstant.invertedEntityKinds[params.entityKinds[i]];
      keyObjArray.push(
        oThis._keyObj({
          tokenId: params.tokenId,
          entityKind: entityKind
        })
      );
    }

    let response = await oThis.batchGetItem(keyObjArray, 'entityKind');

    let result = {};

    for (let i = 0; i < params.entityKinds.length; i++) {
      let entityKind = params.entityKinds[i],
        entityKindNum = shardConstant.invertedEntityKinds[entityKind];

      if (response.data.hasOwnProperty(entityKindNum)) {
        result[entityKind] = response.data[entityKindNum].shardNumber;
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

  static sanitizeParamsFromDdb(params) {
    params['entityKind'] = shardConstant.entityKinds[params['entityKind']];
    return params;
  }

  static sanitizeParamsForQuery(params) {
    params['entityKind'] = shardConstant.invertedEntityKinds[params['entityKind']];
    return params;
  }
}

InstanceComposer.registerAsShadowableClass(ShardByToken, coreConstants.icNameSpace, 'ShardByTokenModel');

module.exports = ShardByToken;
