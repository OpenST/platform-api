/**
 * Module for base currency table model.
 *
 * @module app/models/ddb/shared/BaseCurrency
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  Base = require(rootPrefix + '/app/models/ddb/shared/Base'),
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for base currency model.
 *
 * @class BaseCurrency
 */
class BaseCurrency extends Base {
  /**
   * Mapping of long column names to their short names.
   *
   * @return {{name: string, symbol: string, decimal: string, contractAddress: string}}
   */
  get longToShortNamesMap() {
    return {
      name: 'nm',
      symbol: 'sym',
      decimal: 'dc',
      contractAddress: 'ca'
    };
  }

  /**
   * Mapping for short names to their data types.
   *
   * @return {{nm: string, sym: string, dc: string, ca: string}}
   */
  get shortNameToDataType() {
    return {
      nm: 'S',
      sym: 'S',
      dc: 'N',
      ca: 'S'
    };
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {object}
   */
  get shortToLongNamesMap() {
    const oThis = this;

    return util.invert(oThis.longToShortNamesMap);
  }

  /**
   * Returns the table name.
   *
   * @returns {string}
   */
  tableName() {
    const oThis = this;

    return oThis.tablePrefix + 'base_currencies';
  }

  /**
   * Returns condition expression.
   *
   * @returns {string}
   */
  conditionExpression() {
    const oThis = this,
      contractAddressShortName = oThis.shortNameFor('contractAddress');

    return 'attribute_not_exists(' + contractAddressShortName + ')';
  }

  /**
   * Primary key of the table.
   *
   * @param params
   *
   * @returns {Object}
   *
   * @private
   */
  _keyObj(params) {
    const oThis = this,
      keyObj = {},
      contractAddressShortName = oThis.shortNameFor('contractAddress');

    keyObj[contractAddressShortName] = {
      [oThis.shortNameToDataType[contractAddressShortName]]: params.contractAddress.toString()
    };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {object}
   */
  tableSchema() {
    const oThis = this;

    const contractAddressShortName = oThis.shortNameFor('contractAddress');

    const tableSchema = {
      TableName: oThis.tableName(),
      KeySchema: [
        {
          AttributeName: contractAddressShortName,
          KeyType: 'HASH'
        } // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: contractAddressShortName, AttributeType: oThis.shortNameToDataType[contractAddressShortName] }
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
   * Sanitize row from dynamo. No sanitization needed here.
   *
   * @param {object} params
   *
   * @return {object}
   * @private
   */
  _sanitizeRowFromDynamo(params) {
    return params;
  }

  /**
   * Sanitize row for dynamo. No sanitization needed here.
   *
   * @param {object} params
   *
   * @return {object}
   * @private
   */
  _sanitizeRowForDynamo(params) {
    params.contractAddress = basicHelper.sanitizeAddress(params.contractAddress);

    return params;
  }

  /**
   * Insert base currency name, symbol, decimals and contract address.
   *
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.symbol
   * @param {number} params.decimal
   * @param {string} params.contractAddress
   *
   * @return {Promise<Promise<void>|*|Request<DynamoDB.PutItemOutput, AWSError>|promise<result>|{type, required, members}>}
   */
  async insertBaseCurrency(params) {
    const oThis = this;

    return oThis.putItem(params, oThis.conditionExpression());
  }

  /**
   * Get base currency.
   *
   * @param {object} params
   * @param {array<string>} params.contractAddresses
   *
   * @return {Promise<*|result>}
   */
  async getBaseCurrency(params) {
    const oThis = this;

    const keyObjArray = [];

    for (let index = 0; index < params.contractAddresses.length; index++) {
      keyObjArray.push(
        oThis._keyObj({
          contractAddress: params.contractAddresses[index]
        })
      );
    }

    const response = await oThis.batchGetItem(keyObjArray, 'contractAddress').catch(function(err) {
      return oThis._prepareErrorObject({
        errorObject: err,
        internalErrorCode: 'a_m_d_s_bc_1',
        apiErrorIdentifier: 'base_currency_fetch_failed',
        debugOptions: { params: params, err: err }
      });
    });

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    const result = {};

    for (let index = 0; index < params.contractAddresses.length; index++) {
      const contractAddress = params.contractAddresses[index];
      if (response.data.hasOwnProperty(contractAddress)) {
        result[contractAddress] = response.data[contractAddress];
      }
    }

    return responseHelper.successWithData(result);
  }

  /**
   * Update item.
   *
   * @returns {Promise<*>}
   */
  async updateItem() {
    throw new Error('Cannot update base currencies table.');
  }

  /**
   * AfterUpdate - Method to implement any after update actions.
   *
   * @return {Promise<void>}
   */
  static async afterUpdate() {
    return responseHelper.successWithData({});
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {BaseCurrency}
   */
  get subClass() {
    return BaseCurrency;
  }
}

InstanceComposer.registerAsShadowableClass(BaseCurrency, coreConstants.icNameSpace, 'BaseCurrency');

module.exports = BaseCurrency;
