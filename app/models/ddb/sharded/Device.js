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

    return oThis.putItem(Device.sanitizeParamsForUpdate(params), conditionalExpression);
  }

  /**
   * updateStatus - Updates status of device
   *
   * @param params
   * @param params.userId {String} - uuid
   * @param params.walletAddress {String}
   * @param params.status {String} - {REGISTERED,AUTHORIZING, AUTHORIZED, REVOKING, REVOKED}
   *
   * @return {Promise<void>}
   */
  async updateStatus(params) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForWalletAddress = oThis.shortNameFor('walletAddress');

    let conditionalExpression =
      'attribute_exists(' + shortNameForUserId + ') AND attribute_exists(' + shortNameForWalletAddress + ')';

    return oThis.updateItem(Device.sanitizeParamsForUpdate(params), conditionalExpression);
  }

  static sanitizeParamsForUpdate(params) {
    params['status'] = DeviceConstant.invertedKinds[params['status']];
    return params;
  }

  /**
   * Get device details.
   *
   * @param {Array} params [{userId: '1234', walletAddress: '0x123....'}, {userId: '1234', walletAddress: '0x123....'}]
   * @param params[index].userId {String} - uuid
   * @param params[index].walletAddress {String}
   *
   * @return {Promise<void>}
   */
  async getDeviceDetails(params) {
    const oThis = this;

    let keyObjArray = [];
    for (let index = 0; index < params.length; index++) {
      keyObjArray.push(
        oThis._keyObj({
          userId: params[index].userId,
          walletAddress: params[index].walletAddress
        })
      );
    }
    return await oThis.batchGetItem(keyObjArray, 'userId');
  }

  /**
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  static async afterUpdate(ic, rowData) {
    require(rootPrefix + '/lib/cacheManagement/chain/DeviceDetail');

    let cacheClass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache');
    new cacheClass(rowData).clear();

    logger.info('device cache cleared.');
    return responseHelper.successWithData({});
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
