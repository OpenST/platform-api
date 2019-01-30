'use strict';

const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  Base = require(rootPrefix + '/app/models/ddb/sharded/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  util = require(rootPrefix + '/lib/util');

const mustache = require('mustache');

const InstanceComposer = OSTBase.InstanceComposer;

class User extends Base {
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
    const oThis = this;

    return {
      tokenId: 'tid',
      userId: 'uid',
      kind: 'k',
      tokenHolderAddress: 'tha',
      multisigAddress: 'ma',
      deviceShardNumber: 'dsn',
      sessionShardNumber: 'ssn',
      recoveryAddressShardNumber: 'rasn',
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
   * @return {{}}
   */
  get shortNameToDataType() {
    return {
      tid: 'N',
      uid: 'S',
      k: 'N',
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
   * Returns the table name.
   *
   * @returns {String}
   */
  tableName() {
    return this.tablePrefix + 'users_';
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
   * Returns the table name template variables.
   *
   * @returns {{shardByTransactionShardIdentifier: *}}
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

    keyObj[oThis.shortNameFor('tokenId')] = { N: params['tokenId'].toString() };
    keyObj[oThis.shortNameFor('userId')] = { S: params['userId'].toString() };

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
            AttributeName: oThis.shortNameFor('userId'),
            KeyType: 'RANGE'
          } //Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: oThis.shortNameFor('tokenId'), AttributeType: 'N' },
          { AttributeName: oThis.shortNameFor('userId'), AttributeType: 'S' }
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
   * getUsersByIds
   *
   * @param params
   * @param params.tokenId {Number} - tokenId of users group to fetch
   * @param params.userIds {Array}  - user ids of the users
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
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  async afterUpdate() {
    const oThis = this;

    return responseHelper.successWithData({});
  }
}

InstanceComposer.registerAsShadowableClass(User, coreConstants.icNameSpace, 'UserModel');

module.exports = User;
