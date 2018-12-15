'use strict';

/**
 * @fileoverview Base class for models
 *
 * @author Alpesh Modi
 * @reviewer Kedar Chandrayan
 */

const rootPrefix = '../../..',
  MysqlQueryKlass = require(rootPrefix + '/lib/queryBuilders/mysql'),
  mysqlWrapper = require(rootPrefix + '/lib/mysqlWrapper'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class ModelBase extends MysqlQueryKlass {

  constructor(params){
    super(params);

    const oThis = this;
    oThis.dbName = params.dbName;

    oThis.bitColumns = {};

  }

  // get read connection
  onReadConnection() {
    return mysqlWrapper.getPoolFor(this.dbName, 'master');
  }

  // on write connection
  onWriteConnection() {
    return mysqlWrapper.getPoolFor(this.dbName, 'master');
  }

  fire() {
    const oThis = this;

    return new Promise(function(onResolve, onReject) {
      const queryGenerator = oThis.generate();
      if (queryGenerator.isSuccess()) {
        //logger.log(queryGenerator.data.query, queryGenerator.data.queryData);
      }

      let preQuery = Date.now();
      let qry = oThis
        .onWriteConnection()
        .query(queryGenerator.data.query, queryGenerator.data.queryData, function(err, result, fields) {
          logger.info('(' + (Date.now() - preQuery) + ' ms)', qry.sql);
          if (err) {
            onReject(err);
          } else {
            onResolve(result);
          }
        });
    });
  }

  /**
   * Set all data as hashmap for performing bitwise operations
   */
  setBitColumns() {
    throw 'SubClass to Implement';
  }

  /**
   * Validate all Bitwise columns of a model for uniqueness.
   *
   * @return {string}
   */
  validateBitColumns() {
    const oThis = this;

    // Validate only if model has bitwise columns
    if (Object.keys(oThis.bitColumns).length > 0) {
      let allBits = [];

      for (let i = 0, keys = Object.keys(oThis.bitColumns), ii = keys.length; i < ii; i++) {
        let columnBits = Object.keys(oThis.bitColumns[keys[i]]);
        for (let j = 0; j < columnBits.length; j++) {
          if (allBits.includes(columnBits[j])) {
            throw 'Bit Keys name should be unique across all columns of model.';
          } else {
            allBits.push(columnBits[j]);
          }
        }
      }
    }

    return 'success';
  }

  /**
   * Set Bit in the column for a given bit string.
   *
   * @param bitName
   * @param previousValue
   * @return {number}
   */
  setBit(bitName, previousValue) {
    const oThis = this;

    let resp = oThis.findValueOfBit(bitName);
    if (resp) {
      logger.debug(resp);
      return resp['bitValue'] | previousValue;
    }

    // If Bit is not found for any column then return old value.
    return previousValue;
  }

  /**
   * Unset Bit in the column for a given bit string.
   *
   * @param bitName
   * @param previousValue
   * @return {number}
   */
  unsetBit(bitName, previousValue) {
    const oThis = this;

    let resp = oThis.findValueOfBit(bitName);
    if (resp) {
      let val = resp['bitValue'] ^ previousValue;
      // If XOR operator returns value less than previous value means bit was set previously else not.
      if (val < previousValue) {
        return val;
      }
    }

    // If Bit is not found for any column then return old value.
    return previousValue;
  }

  /**
   * Check whether bit is set in a value for a given bitName
   *
   * @param bitName
   * @param currentValue
   * @return {boolean}
   */
  isBitSet(bitName, currentValue) {
    const oThis = this;

    let resp = oThis.findValueOfBit(bitName);
    if (resp) {
      let val = resp['bitValue'] & currentValue;
      // If Bitwise and operator returns 0 means bit is not set.
      return val == resp['bitValue'];
    }

    // If Bit is not found for any column then return false.
    return false;
  }

  /**
   * Get all bits set for a given column
   *
   * @param columnName
   * @param currentValue
   * @return {Array}
   */
  getAllBits(columnName, currentValue) {
    const oThis = this;

    let allBits = oThis.bitColumns[columnName];
    if (allBits && Object.keys(allBits).length > 0) {
      let bitNames = Object.keys(allBits);
      let arr = [];
      for (let i = 0; i < bitNames.length; i++) {
        if (oThis.isBitSet(bitNames[i], currentValue)) {
          arr.push(bitNames[i]);
        }
      }
      return arr;
    }
    return [];
  }

  /**
   * Fetch Column and Value of a given bit
   *
   * @param bitName
   * @return {*}
   */
  findValueOfBit(bitName) {
    const oThis = this;

    for (let i = 0, keys = Object.keys(oThis.bitColumns), ii = keys.length; i < ii; i++) {
      let columnName = keys[i];
      let columnBits = Object.keys(oThis.bitColumns[columnName]);
      if (columnBits.includes(bitName)) {
        let bitValue = oThis.bitColumns[columnName][bitName];
        return { column: columnName, bitValue: bitValue };
      }
    }

    return null;
  }
}

module.exports = ModelBase;
