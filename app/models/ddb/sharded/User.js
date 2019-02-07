'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  Base = require(rootPrefix + '/app/models/ddb/sharded/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for user model.
 *
 * @class
 */
class User extends Base {
  /**
   * Constructor for user model.
   *
   * @param {Object} params
   * @param {Number} params.chainId: chainId
   * @param {Number} params.consistentRead: (1,0)
   * @param {Number} params.shardNumber
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{}}
   */
  get longToShortNamesMap() {
    const oThis = this;

    return {
      tokenId: 'tid',
      userId: 'uid',
      kind: 'ki',
      tokenHolderAddress: 'tha',
      multisigAddress: 'ma',
      deviceShardNumber: 'dsn',
      sessionShardNumber: 'ssn',
      recoveryAddressShardNumber: 'rasn',
      status: 'sts',
      updatedTimestamp: 'uts'
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
   * shortNameToDataType
   *
   * @return {{}}
   */
  get shortNameToDataType() {
    return {
      tid: 'N',
      uid: 'S',
      ki: 'N',
      tha: 'S',
      ma: 'S',
      dsn: 'N',
      ssn: 'N',
      rasn: 'N',
      sts: 'N',
      uts: 'N'
    };
  }

  /**
   * Returns the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    return 'users_{{shardNumber}}';
  }

  /**
   * Primary key of the table.
   *
   * @param {Object} params
   * @param {String/Number} params.tokenId
   * @param {String/Number} params.userId
   *
   * @returns {Object}
   *
   * @private
   */
  _keyObj(params) {
    const oThis = this,
      keyObj = {};

    let tokenIdShortName = oThis.shortNameFor('tokenId'),
      userIdShortName = oThis.shortNameFor('userId');

    keyObj[tokenIdShortName] = { [oThis.shortNameToDataType[tokenIdShortName]]: params['tokenId'].toString() };
    keyObj[userIdShortName] = { [oThis.shortNameToDataType[userIdShortName]]: params['userId'].toString() };

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
      userIdShortName = oThis.shortNameFor('userId');

    const tableSchema = {
      TableName: oThis.tableName(),
      KeySchema: [
        {
          AttributeName: tokenIdShortName,
          KeyType: 'HASH'
        }, //Partition key
        {
          AttributeName: userIdShortName,
          KeyType: 'RANGE'
        } //Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: tokenIdShortName, AttributeType: oThis.shortNameToDataType[tokenIdShortName] },
        { AttributeName: userIdShortName, AttributeType: oThis.shortNameToDataType[userIdShortName] }
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
   * Get Users By ids
   *
   * @param {Object} params
   * @param {Number} params.tokenId: tokenId of users group to fetch
   * @param {Array}  params.userIds: user ids of the users
   *
   * @return {Promise<void>}
   */
  async getUsersByIds(params) {
    const oThis = this;

    let keyObjArray = [];

    for (let i = 0; i < params.userIds.length; i++) {
      keyObjArray.push(
        oThis._keyObj({
          tokenId: params.tokenId,
          userId: params.userIds[i]
        })
      );
    }

    return oThis.batchGetItem(keyObjArray, 'userId');
  }

  /**
   * InsertShard - Inserts a new user in user shards
   *
   * @param {Object} params
   * @param {String/Number} params.tokenId
   * @param {String/Number} params.userId
   *
   * @return {string}
   */
  async insertUser(params) {
    const oThis = this,
      shortNameForTokenId = oThis.shortNameFor('tokenId'),
      shortNameForUserId = oThis.shortNameFor('userId');

    let conditionalExpression =
      'attribute_not_exists(' + shortNameForTokenId + ') AND attribute_not_exists(' + shortNameForUserId + ')';

    return oThis.putItem(User.sanitizeParamsForQuery(params), conditionalExpression);
  }

  /**
   * Update status of user from created to activating
   *
   * @param {String/Number} tokenId
   * @param {String} userId
   *
   * @return {Promise<void>}
   */
  async updateStatusFromCreatedToActivating(tokenId, userId) {
    const oThis = this,
      shortNameForTokenId = oThis.shortNameFor('tokenId'),
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForKind = oThis.shortNameFor('kind'),
      shortNameForStatus = oThis.shortNameFor('status'),
      dataTypeForKind = oThis.shortNameToDataType[shortNameForKind],
      dataTypeForTokenId = oThis.shortNameToDataType[shortNameForTokenId],
      dataTypeForUserId = oThis.shortNameToDataType[shortNameForUserId],
      dataTypeForStatus = oThis.shortNameToDataType[shortNameForStatus],
      userKindInt = tokenUserConstants.invertedKinds[tokenUserConstants.userKind],
      createdStatusInt = tokenUserConstants.invertedStatuses[tokenUserConstants.createdStatus],
      activatingStatusInt = tokenUserConstants.invertedStatuses[tokenUserConstants.activatingStatus];

    let finalResponse = {};

    const updateQuery = {
      TableName: oThis.tableName(),
      Key: {
        tid: { [dataTypeForTokenId]: tokenId.toString() },
        uid: { [dataTypeForUserId]: userId.toString() }
      },
      ConditionExpression:
        'attribute_exists(' +
        shortNameForTokenId +
        ') AND attribute_exists(' +
        shortNameForUserId +
        ')' +
        ' AND #createdStatus = :createdStatus AND #userKind = :userKind',
      ExpressionAttributeNames: {
        '#createdStatus': shortNameForStatus,
        '#activatingStatus': shortNameForStatus,
        '#userKind': shortNameForKind
      },
      ExpressionAttributeValues: {
        ':createdStatus': { [dataTypeForStatus]: createdStatusInt },
        ':activatingStatus': { [dataTypeForStatus]: activatingStatusInt },
        ':userKind': { [dataTypeForKind]: userKindInt }
      },
      UpdateExpression: 'SET #activatingStatus = :activatingStatus',
      ReturnValues: 'ALL_NEW'
    };

    let updateQueryResponse = await oThis.ddbServiceObj.updateItem(updateQuery);

    if (updateQueryResponse.internalErrorCode.endsWith('ConditionalCheckFailedException')) {
      return responseHelper.error({
        internal_error_identifier: 'a_m_d_s_u_1',
        api_error_identifier: 'conditional_check_failed',
        debug_options: { error: updateQueryResponse.toHash() }
      });
    }

    updateQueryResponse = updateQueryResponse.data.Attributes;

    for (let attribute in updateQueryResponse) {
      let attributeLongName = oThis.shortToLongNamesMap[attribute],
        dataTypeForAttribute = oThis.shortNameToDataType[attribute];

      finalResponse[attributeLongName] = updateQueryResponse[attribute][dataTypeForAttribute];
    }

    return Promise.resolve(responseHelper.successWithData(finalResponse));
  }

  /**
   * Update status of user
   *
   * @param {Object} params
   * @param {String/Number} params.tokenId
   * @param {String} params.userId
   * @param {String} params.status: 'created' or 'activating' or 'activated'
   *
   * @return {Promise<void>}
   */
  async updateStatus(params) {
    const oThis = this,
      shortNameForTokenId = oThis.shortNameFor('tokenId'),
      shortNameForUserId = oThis.shortNameFor('userId');

    let conditionalExpression =
      'attribute_exists(' + shortNameForTokenId + ') AND attribute_exists(' + shortNameForUserId + ')';

    return oThis.updateItem(User.sanitizeParamsToInsert(params), conditionalExpression);
  }

  /**
   * Sanitize params for insert.
   *
   * @param params
   *
   * @return {*}
   */
  static sanitizeParamsToInsert(params) {
    params['status'] = tokenUserConstants.invertedStatuses[params['status']];
    return params;
  }

  /**
   * Get token users paginated data
   *
   * @param {Number} tokenId
   * @param {Number} [limit] - optional
   * @param [lastEvaluatedKey] - optional
   *
   * @returns {Promise<*>}
   */
  async getUsers(tokenId, limit, lastEvaluatedKey) {
    const oThis = this,
      shortNameForTokenId = oThis.shortNameFor('tokenId'),
      dataTypeForTokenId = oThis.shortNameToDataType[shortNameForTokenId];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForTokenId} = :tid`,
      ExpressionAttributeValues: {
        ':tid': { [dataTypeForTokenId]: tokenId.toString() }
      },
      Limit: limit || pagination.defaultUserListPageSize
    };
    if (lastEvaluatedKey) {
      queryParams['ExclusiveStartKey'] = lastEvaluatedKey;
    }

    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    let row,
      formattedRow,
      users = [];

    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      formattedRow = oThis._formatRowFromDynamo(row);
      users.push(formattedRow);
    }

    let responseData = {
      users: users
    };

    if (response.data.LastEvaluatedKey) {
      responseData['nextPagePayload'] = {
        [pagination.paginationIdentifierKey]: basicHelper.encryptNextPagePayload({
          lastEvaluatedKey: response.data.LastEvaluatedKey
        })
      };
    }

    return Promise.resolve(responseHelper.successWithData(responseData));
  }

  /**
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  static async afterUpdate(ic, params) {
    const TokenUserDetailsCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    let tokenUserDetailsCache = new TokenUserDetailsCache({
      tokenId: params.tokenId,
      userIds: [params.userId],
      shardNumber: params.shardNumber
    });

    await tokenUserDetailsCache.clear();

    return responseHelper.successWithData({});
  }

  /**
   * Sanitize query for params
   *
   * @param {Object} params
   *
   * @return {*}
   */
  static sanitizeParamsForQuery(params) {
    params['kind'] = tokenUserConstants.invertedKinds[params['kind']];
    params['status'] = tokenUserConstants.invertedStatuses[params['status']];
    return params;
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {object}
   */
  get subClass() {
    return User;
  }
}

InstanceComposer.registerAsShadowableClass(User, coreConstants.icNameSpace, 'UserModel');

module.exports = User;
