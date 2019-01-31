'use strict';
/**
 * Device model.
 *
 * @module app/models/ddb/sharded/Device.js
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  Base = require(rootPrefix + '/app/models/ddb/sharded/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  util = require(rootPrefix + '/lib/util');

const mustache = require('mustache'),
  InstanceComposer = OSTBase.InstanceComposer;

/**
 * Devices model class.
 *
 * @class Device
 */
class Device extends Base {
  /**
   *
   * @param {Object} params
   * @param {Number} params.consistentRead: (1,0)
   * @param {Number} params.shardNumber
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.shardNumber = params.shardNumber;
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
      updateTimestamp: 'uts'
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
   * Returns the table name.
   *
   * @returns {String}
   */
  tableName() {
    return this.tablePrefix + 'device_';
  }

  /**
   * Returns the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    return 'device_{{shardNumber}}';
  }

  /**
   * Returns the table name template variables.
   *
   * @returns {{shardNumber: *}}
   */
  tableNameTemplateVars() {
    const oThis = this;

    return {
      shardNumber: oThis.shardNumber
    };
  }

  /**
   * tableName
   *
   * @return {*|void}
   */
  tableName() {
    const oThis = this,
      tableNameTemplate = oThis.tablePrefix + oThis.tableNameTemplate(),
      tableNameVars = oThis.tableNameTemplateVars();

    return mustache.render(tableNameTemplate, tableNameVars);
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

    keyObj[oThis.shortNameFor('userId')] = { S: params['userId'] };
    keyObj[oThis.shortNameFor('walletAddress')] = { S: params['walletAddress'] };

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
            AttributeName: oThis.shortNameFor('userId'),
            KeyType: 'HASH'
          }, //Partition key
          {
            AttributeName: oThis.shortNameFor('walletAddress'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('userId'), AttributeType: 'S' },
          { AttributeName: oThis.shortNameFor('walletAddress'), AttributeType: 'S' }
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
   * @param {Number} params.userId
   * @param {String} params.walletAddress
   * @param {String} params.personalSignAddress
   * @param {String} params.deviceUuid
   * @param {String} params.deviceName
   * @param {Number} params.status
   * @param {Number} params.updateTimestamp
   * @returns {*|promise<result>}
   */
  create(params) {
    const oThis = this,
      shortNameForUserId = oThis.shortNameFor('userId'),
      shortNameForWalletAddress = oThis.shortNameFor('walletAddress');

    let conditionalExpression =
      'attribute_not_exists(' + shortNameForUserId + ') AND attribute_not_exists(' + shortNameForWalletAddress + ')';

    return oThis.putItem(params, conditionalExpression);
  }

  /**
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  async afterUpdate() {
    const oThis = this;

    return responseHelper.successWithData({});
  }
}

InstanceComposer.registerAsShadowableClass(Device, coreConstants.icNameSpace, 'Device');

module.exports = Device;
