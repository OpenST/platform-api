'use strict';

/**
 * User model.
 *
 * @module app/models/ddb/sharded/User
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  Base = require(rootPrefix + '/app/models/ddb/sharded/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

// Following require(s) for registering into instance composer
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
      salt: 'ss',
      tokenHolderAddress: 'tha',
      multisigAddress: 'ma',
      recoveryOwnerAddress: 'roa',
      recoveryAddress: 'ra',
      deviceShardNumber: 'dsn',
      sessionShardNumber: 'ssn',
      recoveryOwnerShardNumber: 'rosn',
      saasApiStatus: 'sas',
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
      ss: 'S',
      tha: 'S',
      ma: 'S',
      roa: 'S',
      ra: 'S',
      dsn: 'N',
      ssn: 'N',
      rosn: 'N',
      sas: 'N',
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
    return '{{chainId}}_users_{{shardNumber}}';
  }

  /**
   * Returns the first global secondary index name.
   *
   * @returns {String}
   */
  firstGlobalSecondaryIndexName() {
    const oThis = this;

    return oThis.shortNameFor('tokenHolderAddress');
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
      userIdShortName = oThis.shortNameFor('userId'),
      tokenHolderAddressShortName = oThis.shortNameFor('tokenHolderAddress');

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
        { AttributeName: userIdShortName, AttributeType: oThis.shortNameToDataType[userIdShortName] },
        {
          AttributeName: tokenHolderAddressShortName,
          AttributeType: oThis.shortNameToDataType[tokenHolderAddressShortName]
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      },
      SSESpecification: {
        Enabled: false
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: oThis.firstGlobalSecondaryIndexName(),
          KeySchema: [
            {
              AttributeName: tokenHolderAddressShortName,
              KeyType: 'HASH'
            }
          ],
          Projection: {
            ProjectionType: 'KEYS_ONLY'
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        }
      ]
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

    let keyObjArray = [],
      selectColumns = [
        'tokenId',
        'userId',
        'kind',
        'tokenHolderAddress',
        'multisigAddress',
        'recoveryOwnerAddress',
        'recoveryAddress',
        'deviceShardNumber',
        'sessionShardNumber',
        'recoveryOwnerShardNumber',
        'saasApiStatus',
        'status',
        'updatedTimestamp'
      ];

    for (let i = 0; i < params.userIds.length; i++) {
      keyObjArray.push(
        oThis._keyObj({
          tokenId: params.tokenId,
          userId: params.userIds[i]
        })
      );
    }

    return oThis.batchGetItem(keyObjArray, 'userId', selectColumns);
  }

  /**
   * Get User salt from users table.
   *
   * @param tokenId
   * @param userIds
   * @returns {Promise<void>}
   */
  getUsersSalt(tokenId, userIds) {
    const oThis = this;

    let keyObjArray = [],
      selectColumns = ['tokenId', 'userId', 'salt', 'updatedTimestamp'];

    for (let i = 0; i < userIds.length; i++) {
      keyObjArray.push(
        oThis._keyObj({
          tokenId: tokenId,
          userId: userIds[i]
        })
      );
    }

    return oThis.batchGetItem(keyObjArray, 'userId', selectColumns);
  }

  /**
   * Get userIds for respective tokenHolder addresses.
   *
   * @param {Object} params
   * @param {Array} params.tokenHolderAddresses - token holder addresses
   *
   * @return {Promise<void>}
   */
  async getUserIdsByTokenHolderAddresses(params) {
    const oThis = this;

    let promiseArray = [],
      tokenHolderAddressShortName = oThis.shortNameFor('tokenHolderAddress'),
      tokenHolderAddressDatatype = oThis.shortNameToDataType[tokenHolderAddressShortName];

    for (let index = 0; index < params.tokenHolderAddresses.length; index++) {
      let queryParams = {
        TableName: oThis.tableName(),
        IndexName: oThis.firstGlobalSecondaryIndexName(),
        KeyConditionExpression: '#tokenHolderAddress = :tha',
        ExpressionAttributeNames: {
          '#tokenHolderAddress': tokenHolderAddressShortName
        },
        ExpressionAttributeValues: {
          ':tha': { [tokenHolderAddressDatatype]: params.tokenHolderAddresses[index].toString() }
        }
      };

      promiseArray.push(oThis.ddbServiceObj.query(queryParams));
    }
    let responses = await Promise.all(promiseArray);
    let results = [];

    for (let index = 0; index < responses.length; index++) {
      if (responses[index] && responses[index].data && responses[index].data.Items) {
        let result = responses[index].data.Items[0];
        if (result) {
          results.push(result);
        }
      }
    }

    let formattedData = oThis._formatRowsFromDynamo(results, 'tokenHolderAddress');

    return responseHelper.successWithData(formattedData);
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

    return oThis.putItem(params, conditionalExpression);
  }

  /**
   * Update status of user from created to activating
   *
   * @param {String/Number} tokenId
   * @param {String} userId
   * @param {String} initialStatus
   * @param {String} finalStatus
   *
   * @return {Promise<void>}
   */
  async updateStatusFromInitialToFinal(tokenId, userId, initialStatus, finalStatus) {
    const oThis = this,
      shortNameForTokenId = oThis.shortNameFor('tokenId'),
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForStatus = oThis.shortNameFor('status'),
      shortNameForUpdatedTimestamp = oThis.shortNameFor('updatedTimestamp'),
      dataTypeForTokenId = oThis.shortNameToDataType[shortNameForTokenId],
      dataTypeForUserId = oThis.shortNameToDataType[shortNameForUserId],
      dataTypeForStatus = oThis.shortNameToDataType[shortNameForStatus],
      dataTypeForUpdatedTimestamp = oThis.shortNameToDataType[shortNameForUpdatedTimestamp],
      initialStatusInt = tokenUserConstants.invertedStatuses[initialStatus],
      finalStatusInt = tokenUserConstants.invertedStatuses[finalStatus],
      updatedTimestamp = basicHelper.getCurrentTimestampInSeconds().toString();

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
        ' AND #initialStatus = :initialStatus',
      ExpressionAttributeNames: {
        '#initialStatus': shortNameForStatus,
        '#finalStatus': shortNameForStatus,
        '#updatedTimestamp': shortNameForUpdatedTimestamp
      },
      ExpressionAttributeValues: {
        ':initialStatus': { [dataTypeForStatus]: initialStatusInt },
        ':finalStatus': { [dataTypeForStatus]: finalStatusInt },
        ':updatedTimestamp': { [dataTypeForUpdatedTimestamp]: updatedTimestamp }
      },
      UpdateExpression: 'SET #finalStatus = :finalStatus, #updatedTimestamp = :updatedTimestamp',
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

    // Clear cache
    await User.afterUpdate(oThis.ic(), { tokenId: tokenId, userId: userId, shardNumber: oThis.shardNumber });

    updateQueryResponse = oThis._formatRowFromDynamo(updateQueryResponse.data.Attributes);

    return Promise.resolve(responseHelper.successWithData(oThis._sanitizeRowFromDynamo(updateQueryResponse)));
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

    return oThis.updateItem(params, conditionalExpression);
  }

  /**
   * Sanitize params for insert.
   *
   * @param {Object} params
   *
   * @return {*}
   *
   * @private
   */
  _sanitizeRowForDynamo(params) {
    if (params['kind']) {
      params['kind'] = tokenUserConstants.invertedKinds[params['kind']];
    }
    if (params['tokenHolderAddress']) {
      params['tokenHolderAddress'] = basicHelper.sanitizeAddress(params['tokenHolderAddress']);
    }
    if (params['multisigAddress']) {
      params['multisigAddress'] = basicHelper.sanitizeAddress(params['multisigAddress']);
    }
    if (params['saasApiStatus']) {
      params['saasApiStatus'] = tokenUserConstants.invertedSaasApiStatuses[params['saasApiStatus']];
    }
    if (params['recoveryOwnerAddress']) {
      params['recoveryOwnerAddress'] = basicHelper.sanitizeAddress(params['recoveryOwnerAddress']);
    }
    if (params['recoveryAddress']) {
      params['recoveryAddress'] = basicHelper.sanitizeAddress(params['recoveryAddress']);
    }
    if (params['status']) {
      params['status'] = tokenUserConstants.invertedStatuses[params['status']];
    }
    if (!params['updatedTimestamp']) {
      params['updatedTimestamp'] = basicHelper.getCurrentTimestampInSeconds();
    }
    return params;
  }

  /**
   * Method to perform extra formatting
   *
   * @param {Object} dbRow
   *
   * @return {Object}
   *
   * @private
   */
  _sanitizeRowFromDynamo(dbRow) {
    dbRow['status'] = tokenUserConstants.statuses[dbRow['status']];
    dbRow['kind'] = tokenUserConstants.kinds[dbRow['kind']];
    if (dbRow.hasOwnProperty('saasApiStatus')) {
      dbRow['saasApiStatus'] =
        tokenUserConstants.saasApiStatuses[dbRow['saasApiStatus']] || tokenUserConstants.saasApiActiveStatus;
    }
    return dbRow;
  }

  /**
   * Get token users paginated data
   *
   * @param {Number} tokenId
   * @param {Number} page  - page number
   * @param {Number} limit
   * @param [lastEvaluatedKey] - optional
   *
   * @returns {Promise<*>}
   */
  async getUserIds(tokenId, page, limit, lastEvaluatedKey) {
    const oThis = this,
      shortNameForTokenId = oThis.shortNameFor('tokenId'),
      dataTypeForTokenId = oThis.shortNameToDataType[shortNameForTokenId];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForTokenId} = :tid`,
      ExpressionAttributeValues: {
        ':tid': { [dataTypeForTokenId]: tokenId.toString() }
      },
      ProjectionExpression: oThis.shortNameFor('userId'),
      Limit: limit
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
      userIds = [];

    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      formattedRow = oThis._formatRowFromDynamo(row);
      userIds.push(formattedRow.userId);
    }

    let responseData = {
      userIds: userIds
    };

    if (response.data.LastEvaluatedKey) {
      responseData[pagination.nextPagePayloadKey] = {
        [pagination.paginationIdentifierKey]: {
          lastEvaluatedKey: response.data.LastEvaluatedKey,
          page: page + 1, //NOTE: page number is used for pagination cache. Not for client communication or query
          limit: limit
        }
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

    require(rootPrefix + '/lib/cacheManagement/chain/TokenUserId');
    let TokenUserIdCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserIdCache'),
      tokenUserIdCache = new TokenUserIdCache({
        tokenId: params.tokenId
      });

    await tokenUserIdCache.clear();

    if (params.hasOwnProperty('tokenHolderAddress')) {
      require(rootPrefix + '/lib/cacheManagement/chainMulti/UserDetail');
      let UserDetailCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'UserDetailCache'),
        userDetailCacheObj = new UserDetailCache({
          tokenHolderAddresses: [params.tokenHolderAddress],
          tokenId: params.tokenId
        });

      await userDetailCacheObj.clear();
    }

    return responseHelper.successWithData({});
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
