'use strict';
/**
 * Device model.
 *
 * @module app/models/ddb/sharded/Device
 */
const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  OSTBase = require('@openstfoundation/openst-base'),
  Base = require(rootPrefix + '/app/models/ddb/sharded/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  DeviceConstant = require(rootPrefix + '/lib/globalConstant/device');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Devices model class.
 *
 * @class Device
 */
class Device extends Base {
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
    return {
      userId: 'uid',
      walletAddress: 'wa',
      personalSignAddress: 'psa',
      deviceUuid: 'du',
      deviceName: 'dn',
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
   * @return {{uid: Number, ek: String, sn: Number}}
   */
  get shortNameToDataType() {
    return {
      uid: 'S',
      wa: 'S',
      psa: 'S',
      du: 'S',
      dn: 'S',
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
    return 'devices_{{shardNumber}}';
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
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForWalletAddress = oThis.shortNameFor('walletAddress');

    keyObj[shortNameForUserId] = { [oThis.shortNameToDataType[shortNameForUserId]]: params['userId'] };
    keyObj[shortNameForWalletAddress] = {
      [oThis.shortNameToDataType[shortNameForWalletAddress]]: params['walletAddress']
    };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {Object}
   */
  tableSchema() {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForWalletAddress = oThis.shortNameFor('walletAddress'),
      dataTypeForUserId = oThis.shortNameToDataType[shortNameForUserId],
      dataTypeForWalletAddress = oThis.shortNameToDataType[shortNameForWalletAddress],
      tableSchema = {
        TableName: oThis.tableName(),
        KeySchema: [
          {
            AttributeName: shortNameForUserId,
            KeyType: 'HASH'
          }, //Partition key
          {
            AttributeName: shortNameForWalletAddress,
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: shortNameForUserId, AttributeType: dataTypeForUserId },
          { AttributeName: shortNameForWalletAddress, AttributeType: dataTypeForWalletAddress }
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
   * Creates entry into Device table.
   *
   * @param {String} params.userId
   * @param {String} params.walletAddress
   * @param {String} params.personalSignAddress
   * @param {String} params.deviceUuid
   * @param {String} params.deviceName
   * @param {Number} params.status
   * @param {Number} params.updatedTimestamp
   * @returns {*|promise<result>}
   */
  create(params) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForWalletAddress = oThis.shortNameFor('walletAddress');

    let conditionalExpression =
      'attribute_not_exists(' + shortNameForUserId + ') AND attribute_not_exists(' + shortNameForWalletAddress + ')';

    return oThis.putItem(Device.sanitizeParamsToInsert(params), conditionalExpression);
  }

  /**
   * updateStatus - Updates status of device
   *
   * @param params
   * @param params.userId {String} - uuid
   * @param params.walletAddress {String}
   * @param params.status {String} - {REGISTERED, AUTHORIZING, AUTHORIZED, REVOKING, REVOKED}
   *
   * @return {Promise<void>}
   */
  async updateStatus(params) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForWalletAddress = oThis.shortNameFor('walletAddress');

    let conditionalExpression =
      'attribute_exists(' + shortNameForUserId + ') AND attribute_exists(' + shortNameForWalletAddress + ')';

    return oThis.updateItem(Device.sanitizeParamsToInsert(params), conditionalExpression);
  }

  static sanitizeParamsToInsert(params) {
    params['status'] = DeviceConstant.invertedKinds[params['status']];
    return params;
  }

  static sanitizeParamsToDisplay(params) {
    params['status'] = DeviceConstant.kinds[params['status']];
    return params;
  }

  /**
   * Get device details.
   *
   * @param {Object} params
   * @param {Integer} params.userId - uuid
   * @param {Array} params.walletAddresses - array of addresses
   *
   * @return {Promise<void>}
   */
  async getDeviceDetails(params) {
    const oThis = this;

    let keyObjArray = [];
    for (let index = 0; index < params['walletAddresses'].length; index++) {
      keyObjArray.push(
        oThis._keyObj({
          userId: params.userId,
          walletAddress: params.walletAddresses[index]
        })
      );
    }
    return await oThis.batchGetItem(keyObjArray, 'walletAddress');
  }

  _formatRowFromDynamo(dbRow) {
    const oThis = this;
    let formattedDbRow = super._formatRowFromDynamo(dbRow);
    formattedDbRow = Device.sanitizeParamsToDisplay(formattedDbRow);
    return formattedDbRow;
  }

  /**
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  static async afterUpdate(ic, params) {
    const oThis = this;
    require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
    let cacheClass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache');
    new cacheClass({
      userId: params.userId,
      walletAddresses: [params.walletAddress]
    }).clear();

    logger.info('device cache cleared.');
    return responseHelper.successWithData({});
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
  async getWalletAddresses(userId, limit, lastEvaluatedKey) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      dataTypeForUserId = oThis.shortNameToDataType[shortNameForUserId];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForUserId} = :uid`,
      ExpressionAttributeValues: {
        ':uid': { [dataTypeForUserId]: userId.toString() }
      },
      ProjectionExpression: oThis.shortNameFor('walletAddress'),
      Limit: limit || pagination.maxDeviceListPageSize
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
      walletAddresses = [];

    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      formattedRow = oThis._formatRowFromDynamo(row);
      walletAddresses.push(formattedRow.walletAddress);
    }

    return Promise.resolve(
      responseHelper.successWithData({
        walletAddresses: walletAddresses,
        nextPagePayload: { lastEvaluatedKey: response.data.LastEvaluatedKey || '' }
      })
    );
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {object}
   */
  get subClass() {
    return Device;
  }
}

InstanceComposer.registerAsShadowableClass(Device, coreConstants.icNameSpace, 'DeviceModel');

module.exports = Device;
