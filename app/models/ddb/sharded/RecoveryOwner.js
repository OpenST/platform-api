/**
 * Class for recovery owner sharded model.
 *
 * @module app/models/ddb/sharded/RecoveryOwner
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  Base = require(rootPrefix + '/app/models/ddb/sharded/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  recoveryOwnerConstants = require(rootPrefix + '/lib/globalConstant/recoveryOwner');

/**
 * Class for recovery owner model.
 *
 * @class RecoveryOwner
 */
class RecoveryOwner extends Base {
  /**
   * Constructor for recovery owner model.
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
      userId: 'uid',
      address: 'adr',
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
    const oThis = this;

    return {
      uid: 'S',
      adr: 'S',
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
    return '{{chainId}}_recovery_owners_{{shardNumber}}';
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

    const userIdShortName = oThis.shortNameFor('userId'),
      addressShortName = oThis.shortNameFor('address');

    keyObj[userIdShortName] = { [oThis.shortNameToDataType[userIdShortName]]: params['userId'] };
    keyObj[addressShortName] = { [oThis.shortNameToDataType[addressShortName]]: params['address'].toLowerCase() };

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
   * Creates new recovery owner in Dynamo
   *
   * @param {Object} params
   *
   * @return {Promise}
   */
  async createRecoveryOwner(params) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForAddress = oThis.shortNameFor('address');

    const conditionalExpression =
      'attribute_not_exists(' + shortNameForUserId + ') AND attribute_not_exists(' + shortNameForAddress + ')';

    return oThis.putItem(params, conditionalExpression);
  }

  /**
   * Get recovery owner details.
   *
   * @param {Object} params
   * @param {Integer} params.userId: uuid
   * @param {Array} params.recoveryOwnerAddresses: array of recovery owner addresses
   *
   * @return {Promise<void>}
   */
  async getRecoveryOwnerDetails(params) {
    const oThis = this;

    const keyObjArray = [];
    for (let index = 0; index < params['recoveryOwnerAddresses'].length; index++) {
      keyObjArray.push(
        oThis._keyObj({
          userId: params.userId,
          address: params.recoveryOwnerAddresses[index]
        })
      );
    }
    return oThis.batchGetItem(keyObjArray, 'address').catch(function(err) {
      logger.error('==== Error', err);

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_m_d_s_ro_1',
          api_error_identifier: 'recovery_owner_detail_fetch_failed',
          debug_options: { error: err }
        })
      );
    });
  }

  /**
   * Update recovery owner status only
   *
   * @param {Object} params
   * @param {Integer} params.userId: uuid
   * @param {String} params.address: address
   * @param {String} params.status: status
   * @param {String/Number} params.updatedTimestamp: updatedTimestamp
   *
   * @return {Promise}
   */
  async updateRecoveryOwnerStatus(params) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForAddress = oThis.shortNameFor('address');

    // Allow only status to be updated.
    const updateParams = {
        userId: params.userId,
        address: params.address,
        status: params.status,
        updatedTimestamp: params.updatedTimestamp
      },
      conditionalExpression =
        'attribute_exists(' + shortNameForUserId + ') AND attribute_exists(' + shortNameForAddress + ')';

    return oThis.updateItem(updateParams, conditionalExpression);
  }

  /**
   * Update status of recovery owner from initial status to final status.
   *
   * @param {String} userId
   * @param {String} recoveryAddress
   * @param {String} initialStatus
   * @param {String} finalStatus
   *
   * @return {Promise<void>}
   */
  async updateStatusFromInitialToFinal(userId, recoveryAddress, initialStatus, finalStatus) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForAddress = oThis.shortNameFor('address'),
      shortNameForStatus = oThis.shortNameFor('status'),
      shortNameForTimestamp = oThis.shortNameFor('updatedTimestamp'),
      dataTypeForStatus = oThis.shortNameToDataType[shortNameForStatus],
      dataTypeForTimestamp = oThis.shortNameToDataType[shortNameForTimestamp],
      initialStatusInt = recoveryOwnerConstants.invertedRecoveryOwnerStatuses[initialStatus],
      finalStatusInt = recoveryOwnerConstants.invertedRecoveryOwnerStatuses[finalStatus];

    const updateQuery = {
      TableName: oThis.tableName(),
      Key: oThis._keyObj({ userId: userId, address: recoveryAddress }),
      ConditionExpression:
        'attribute_exists(' +
        shortNameForUserId +
        ') AND attribute_exists(' +
        shortNameForAddress +
        ')' +
        ' AND #initialStatus = :initialStatus',
      ExpressionAttributeNames: {
        '#initialStatus': shortNameForStatus,
        '#finalStatus': shortNameForStatus,
        '#updatedTimestamp': shortNameForTimestamp
      },
      ExpressionAttributeValues: {
        ':initialStatus': { [dataTypeForStatus]: initialStatusInt },
        ':finalStatus': { [dataTypeForStatus]: finalStatusInt },
        ':updatedTimestamp': { [dataTypeForTimestamp]: basicHelper.getCurrentTimestampInSeconds().toString() }
      },
      UpdateExpression: 'SET #finalStatus = :finalStatus, #updatedTimestamp = :updatedTimestamp',
      ReturnValues: 'ALL_NEW'
    };

    let updateQueryResponse = await oThis.ddbServiceObj.updateItem(updateQuery);

    if (updateQueryResponse.internalErrorCode.endsWith('ConditionalCheckFailedException')) {
      return responseHelper.error({
        internal_error_identifier: 'a_m_d_s_ro_1',
        api_error_identifier: 'conditional_check_failed',
        debug_options: { error: updateQueryResponse.toHash() }
      });
    }

    // Clear cache.
    await RecoveryOwner.afterUpdate(oThis.ic(), { userId: userId, address: recoveryAddress });

    updateQueryResponse = oThis._formatRowFromDynamo(updateQueryResponse.data.Attributes);

    return Promise.resolve(responseHelper.successWithData(oThis._sanitizeRowFromDynamo(updateQueryResponse)));
  }

  /**
   * Method to perform extra formatting.
   *
   * @param {Object} dbRow
   * @param {Number} dbRow.status
   * @param {Number} [dbRow.updatedTimestamp]
   *
   * @return {Object}
   *
   * @private
   */
  _sanitizeRowFromDynamo(dbRow) {
    dbRow['status'] = recoveryOwnerConstants.recoveryOwnerStatuses[dbRow['status']];

    return dbRow;
  }

  /**
   * Method to perform extra formatting.
   *
   * @param {Object} dbRow
   * @param {String} dbRow.status
   * @param {String} dbRow.address
   * @param {Number} [dbRow.updatedTimestamp]
   *
   * @return {Object}
   *
   * @private
   */
  _sanitizeRowForDynamo(dbRow) {
    dbRow['status'] = recoveryOwnerConstants.invertedRecoveryOwnerStatuses[dbRow['status']];
    dbRow['address'] = basicHelper.sanitizeAddress(dbRow['address']);

    if (!dbRow['updatedTimestamp']) {
      dbRow['updatedTimestamp'] = basicHelper.getCurrentTimestampInSeconds().toString();
    }

    return dbRow;
  }

  /**
   * Method to implement any after update actions.
   *
   * @return {Promise<void>}
   */
  static async afterUpdate(ic, params) {
    require(rootPrefix + '/lib/cacheManagement/chainMulti/RecoveryOwnerDetail');
    const RecoveryOwnerDetailCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwnerDetailCache'),
      recoveryOwnerDetailCache = new RecoveryOwnerDetailCache({
        userId: params.userId,
        recoveryOwnerAddresses: [params.address]
      });

    await recoveryOwnerDetailCache.clear();

    logger.info('Recovery owner cache cleared.');

    return responseHelper.successWithData({});
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {object}
   */
  get subClass() {
    return RecoveryOwner;
  }
}

InstanceComposer.registerAsShadowableClass(RecoveryOwner, coreConstants.icNameSpace, 'RecoveryOwner');

module.exports = {};
