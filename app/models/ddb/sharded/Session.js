'use strict';

const rootPrefix = '../../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  util = require(rootPrefix + '/lib/util'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/app/models/ddb/sharded/Base');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

class Session extends Base {
  /**
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
      userId: 'uid',
      address: 'adr',
      expirationHeight: 'eh',
      spendingLimit: 'sl',
      status: 's',
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
   * @return {{}}
   */
  get shortNameToDataType() {
    return {
      uid: 'S',
      adr: 'S',
      eh: 'N',
      sl: 'N',
      s: 'N',
      uts: 'N'
    };
  }

  /**
   * Returns the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    return 'sessions_{{shardNumber}}';
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

    let userIdShortName = oThis.shortNameFor('userId'),
      addressShortName = oThis.shortNameFor('address');

    keyObj[userIdShortName] = { [oThis.shortNameToDataType[userIdShortName]]: params['userId'].toString() };
    keyObj[addressShortName] = { [oThis.shortNameToDataType[addressShortName]]: params['address'].toString() };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {Object}
   */
  tableSchema() {
    const oThis = this,
      userIdShortName = oThis.shortNameFor('userId'),
      addressShortName = oThis.shortNameFor('address');

    const tableSchema = {
      TableName: oThis.tableName(),
      KeySchema: [
        {
          AttributeName: userIdShortName,
          KeyType: 'HASH'
        }, //Partition key
        {
          AttributeName: addressShortName,
          KeyType: 'RANGE'
        } //Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: userIdShortName, AttributeType: oThis.shortNameToDataType[userIdShortName] },
        { AttributeName: addressShortName, AttributeType: oThis.shortNameToDataType[addressShortName] }
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
   * Creates new session in Dynamo
   *
   * @param params
   * @return {Promise}
   */
  async createSession(params) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForAddress = oThis.shortNameFor('address');

    let conditionalExpression =
      'attribute_not_exists(' + shortNameForUserId + ') AND attribute_not_exists(' + shortNameForAddress + ')';

    return oThis.putItem(params, conditionalExpression);
  }

  /**
   * Get session details.
   *
   * @param {Object} params
   * @param {Integer} params.userId - uuid
   * @param {Array} params.addresses - array of addresses
   *
   * @return {Promise<void>}
   */
  async getSessionDetails(params) {
    const oThis = this;

    let keyObjArray = [];
    for (let index = 0; index < params['addresses'].length; index++) {
      keyObjArray.push(
        oThis._keyObj({
          userId: params.userId,
          address: params.addresses[index]
        })
      );
    }
    return oThis.batchGetItem(keyObjArray, 'address');
  }

  /**
   * Get paginated data
   *
   * @param {Number} userId
   * @param {Number} [limit] - optional
   * @param [lastEvaluatedKey] - optional
   *
   * @returns {Promise<*>}
   */
  async getSessionsAddresses(userId, limit, lastEvaluatedKey) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      dataTypeForUserId = oThis.shortNameToDataType[shortNameForUserId];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForUserId} = :uid`,
      ExpressionAttributeValues: {
        ':uid': { [dataTypeForUserId]: userId.toString() }
      },
      ProjectionExpression: oThis.shortNameFor('address'),
      Limit: limit || pagination.maxSessionPageSize
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
      addresses = [];

    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      formattedRow = oThis._formatRowFromDynamo(row);
      addresses.push(formattedRow.address);
    }

    let responseData = {
      addresses: addresses
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
   * Update session status only
   *
   * @param params
   * @return {Promise}
   */
  async updateSessionStatus(params) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForAddress = oThis.shortNameFor('address');

    // Allow only status to be updated
    let updateParams = {
      userId: params.userId,
      address: params.address,
      status: params.status,
      updatedTimestamp: params.updatedTimestamp
    };

    let conditionalExpression =
      'attribute_exists(' + shortNameForUserId + ') AND attribute_exists(' + shortNameForAddress + ')';

    return oThis.updateItem(updateParams, conditionalExpression);
  }

  /**
   *
   * method to perform extra formatting
   *
   * @param dbRow
   * @return {Object}
   * @private
   */
  _sanitizeRowFromDynamo(dbRow) {
    dbRow['status'] = sessionConstants.sessionStatuses[dbRow['status']];
    return dbRow;
  }

  /**
   *
   * method to perform extra formatting
   *
   * @param dbRow
   * @return {Object}
   * @private
   */
  _sanitizeRowForDynamo(dbRow) {
    dbRow['status'] = sessionConstants.invertedSessionStatuses[dbRow['status']];
    dbRow['address'] = basicHelper.sanitizeAddress(dbRow['address']);
    return dbRow;
  }

  /**
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  static async afterUpdate(ic, params) {
    require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');
    let SessionsByAddressCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: params.userId,
        addresses: [params.address]
      });

    await sessionsByAddressCache.clear();

    require(rootPrefix + '/lib/cacheManagement/chain/SessionAddressesByUserId');
    let SessionAddressesByUserIdCache = ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'SessionAddressesByUserIdCache'
      ),
      sessionAddressesByUserIdCache = new SessionAddressesByUserIdCache({
        userId: params.userId
      });

    await sessionAddressesByUserIdCache.clear();

    logger.info('Session caches cleared.');
    return responseHelper.successWithData({});
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {object}
   */
  get subClass() {
    return Session;
  }
}

InstanceComposer.registerAsShadowableClass(Session, coreConstants.icNameSpace, 'SessionModel');

module.exports = Session;
