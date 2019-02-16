'use strict';

const rootPrefix = '../..',
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  BigNumber = require('bignumber.js'),
  environmentInfo = require(rootPrefix + '/lib/globalConstant/environmentInfo');

/**
 * CommonValidator
 * @constructor
 */
class CommonValidator {
  constructor() {}

  /**
   * Validation for arbitrary commission flag
   *
   * @param commission_percent
   * @param arbitrary_commission
   */
  static validateArbitraryCommissionPercent(commission_percent, arbitrary_commission) {
    const oThis = this;

    if (!oThis.isVarNull(arbitrary_commission) && !oThis.validateBoolean(arbitrary_commission)) {
      return false;
    }

    if (oThis.isVarTrue(arbitrary_commission) && !oThis.isVarNull(commission_percent)) {
      return false;
    }

    if (oThis.isVarFalse(arbitrary_commission)) {
      if (oThis.isVarNull(commission_percent)) {
        return false;
      } else if (!oThis.validateCommissionPercent(commission_percent)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validation for commission percent
   *
   * @param commission_percent
   * @returns {boolean}
   */
  static validateCommissionPercent(commission_percent) {
    const oThis = this;

    if (oThis.isVarNull(commission_percent)) {
      return true;
    }
    if (parseFloat(commission_percent) >= 0 && parseFloat(commission_percent) <= 100) {
      return true;
    }

    return false;
  }

  /**
   * Validation for arbitrary amount flag
   *
   * @param amount
   * @param arbitrary_amount
   * @returns {boolean}
   */
  static validateArbitraryAmount(amount, arbitrary_amount) {
    const oThis = this;

    // arbitrary_amount can be null or a boolean. any other value is not acceptable.
    if (!oThis.isVarNull(arbitrary_amount) && !oThis.validateBoolean(arbitrary_amount)) {
      return false;
    }

    // if arbitrary_amount is true, amount should NOT be sent.
    if (oThis.isVarTrue(arbitrary_amount) && amount >= 0) {
      return false;
    }

    // if arbitrary_amount is false, amount should be sent.
    if (oThis.isVarFalse(arbitrary_amount) && oThis.isVarNull(amount)) {
      return false;
    }

    return true;
  }

  /**
   * Validate page no
   *
   * @param pageNo
   * @return {Array<boolean, number>}
   */
  static validateAndSanitizePageNo(pageNo) {
    const oThis = this;

    if (oThis.isVarNull(pageNo)) {
      return [true, 1];
    }

    if (!pageNo) {
      return [false, 0];
    }

    if (isNaN(parseInt(pageNo))) {
      return [false, 0];
    }

    if (pageNo < 1 || pageNo > 1000) {
      return [false, 0];
    }

    if (parseInt(pageNo) != pageNo) {
      return [false, 0];
    }

    return [true, parseInt(pageNo)];
  }

  /**
   * Validate limit
   *
   * @param limit - limit passed in params
   * @param defaultLimit - default limit
   * @param maxAllowedLimit - max allowed
   *
   * @return {Array<boolean, number>}
   */
  static validateAndSanitizeLimit(limit, defaultLimit, maxAllowedLimit) {
    const oThis = this;

    if (oThis.isVarNull(limit)) {
      return [true, defaultLimit];
    }

    if (!limit) {
      return [false, 0];
    }

    if (isNaN(parseInt(limit))) {
      return [false, 0];
    }

    if (limit < 1 || limit > maxAllowedLimit) {
      return [false, 0];
    }

    if (parseInt(limit) != limit) {
      return [false, 0];
    }

    return [true, parseInt(limit)];
  }

  /**
   *
   * Is valid Boolean
   *
   * @return {Boolean}
   *
   */
  static validateBoolean(str) {
    const oThis = this;

    if (oThis.isVarNull(str)) {
      return false;
    }
    return str === 'true' || str === 'false' || str === true || str === false;
  }

  /**
   * Is var null ?
   *
   * @param {Object/String/Integer/Boolean} variable
   *
   * @return {Boolean}
   */
  static isVarNull(variable) {
    return typeof variable === 'undefined' || variable == null;
  }

  /**
   *
   * Is var null ?
   *
   * @return {Boolean}
   *
   */
  static isVarTrue(variable) {
    return variable === true || variable === 'true';
  }

  /**
   *
   * Is var null ?
   *
   * @return {Boolean}
   *
   */
  static isVarFalse(variable) {
    return variable === false || variable === 'false';
  }

  /**
   *
   * Is var integer ?
   *
   * @return {Boolean}
   *
   */
  static validateInteger(variable) {
    const oThis = this;

    if (!oThis.isVarNull(variable)) {
      if (typeof variable === 'number') {
        return variable % 1 === 0;
      } else {
        let number = Number(variable);
        if (isNaN(number)) {
          return false;
        } else {
          return CommonValidator.validateInteger(number);
        }
      }
    }
  }

  /**
   * Is chainId valid?
   *
   * @param {String/Number} variable
   *
   * @return {*}
   */
  static validateNonZeroInteger(variable) {
    const oThis = this;

    if (oThis.validateInteger(variable)) {
      return Number(variable > 0);
    }
    return false;
  }

  /**
   * Is wei value greater than 0?
   *
   * @param {String/Number} variable
   *
   * @return {*}
   */
  static validateNonZeroWeiValue(variable) {
    try {
      let variableInBn = new BigNumber(String(variable));
      if (variableInBn.gt(new BigNumber('0')) && variableInBn.isInteger()) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  /**
   *
   * Is string valid ?
   *
   * @return {Boolean}
   *
   */
  static validateString(variable) {
    return typeof variable === 'string';
  }

  /**
   *
   * Is var a string containing only alphabets ?
   *
   * @return {Boolean}
   *
   */
  static validateAlphaString(variable) {
    if (CommonValidator.isVarNull(variable)) {
      return false;
    }
    return /^[a-z]+$/i.test(variable);
  }

  /**
   *
   * Is var a string containing alpha numeric chars ?
   *
   * @return {Boolean}
   *
   */
  static validateAlphaNumericString(variable) {
    if (CommonValidator.isVarNull(variable)) {
      return false;
    }
    return /^[a-z0-9]+$/i.test(variable);
  }

  /**
   *
   * Is valid Boolean
   *
   * @return {Boolean}
   *
   */
  static validateOrderingString(str) {
    return ['asc', 'desc'].includes(str.toLowerCase());
  }

  /**
   * Is valid Integer Array
   *
   * @param {Array} array
   *
   * @return {Boolean}
   */
  static validateIntegerArray(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        if (!CommonValidator.validateInteger(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Is valid UUID V4 Array
   *
   * @param {Array} array
   *
   * @return {Boolean}
   */
  static validateUuidV4Array(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        if (!CommonValidator.validateUuidV4(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Is valid eth address Array
   *
   * @param {Array} array
   *
   * @return {Boolean}
   */
  static validateEthAddressArray(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        if (!CommonValidator.validateEthAddress(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   *  This function validates array.
   *
   */
  static validateArray(array) {
    return Array.isArray(array);
  }

  /**
   * Checks if the given string is an address
   *
   * @param address {String} address the given HEX address
   *
   * @return {Boolean}
   */
  static validateEthAddress(address) {
    const oThis = this;

    if (oThis.isVarNull(address) || typeof address !== 'string' || address == '') {
      return false;
    }

    address = address.trim().toLowerCase();

    return /^(0x)?[0-9a-f]{40}$/i.test(address);
  }

  /**
   * Check if uuid is valid or not
   *
   * @param {string} uuid - Branded Token UUID
   *
   * @return {boolean}
   */
  static validateUuid(uuid) {
    if (typeof uuid !== 'string') {
      return false;
    }
    return /^0x[0-9a-fA-F]{64}$/.test(uuid);
  }

  /**
   * Check uuid v4 validation.
   *
   * @param {String} uuid
   *
   * @returns {Boolean}
   */
  static validateUuidV4(uuid) {
    const oThis = this;

    if (!oThis.isVarNull(uuid) && typeof uuid === 'string') {
      return /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(uuid);
    }

    return false;
  }
  /**
   * Check if transaction hash is valid or not
   *
   * @param {String} transactionHash - Transaction hash
   *
   * @return {Boolean}
   */
  static validateTransactionHash(transactionHash) {
    const oThis = this;

    if (!oThis.isVarNull(transactionHash) && typeof transactionHash !== 'string') {
      return /^0x[0-9a-fA-F]{64}$/.test(transactionHash);
    }

    return false;
  }

  /**
   * Check if personal sign is valid or not
   *
   * @param {string} variable - personal sign
   *
   * @return {boolean}
   */
  static validatePersonalSign(variable) {
    const oThis = this;

    if (!oThis.isVarNull(variable) && typeof variable === 'string') {
      return /^0x[0-9a-fA-F]{130}$/.test(variable);
    }

    return false;
  }

  /**
   * Check if timestamp
   *
   * @param {string} variable - variable
   *
   * @return {boolean}
   */
  static validateTimestamp(variable) {
    if (!CommonValidator.validateInteger(variable)) {
      return false;
    }
    return /^[0-9]{10}$/.test(variable);
  }

  /**
   * Check if big number
   *
   * @param {string} variable - variable
   *
   * @return {boolean}
   */
  static validateBigNumber(variable) {
    try {
      new BigNumber(variable);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if variable is a valid request path
   *
   * @param {string} variable - path
   *
   * @return {boolean}
   */
  static validateApiRequestPath(variable) {
    if (typeof variable !== 'string') {
      return false;
    }

    let regexExpressionStr = `\/${environmentInfo.urlPrefix}\/v[0-9]{1}\/.*`,
      regexExpressionObj = new RegExp(regexExpressionStr);

    return regexExpressionObj.test(variable);
  }

  /**
   * Check if variable is object
   *
   * @param {object} variable
   *
   * @return {boolean}
   */
  static validateObject(variable) {
    if (typeof variable !== 'object') {
      return false;
    }

    for (let prop in variable) {
      if (variable.hasOwnProperty(prop)) return true;
    }

    return false;
  }

  /**
   * Check if variable is valid api key
   *
   * @param {string} variable
   *
   * @return {boolean}
   */
  static validateApiKey(variable) {
    if (typeof variable !== 'string') {
      return false;
    }
    return /^[a-z0-9]{32}$/.test(variable);
  }

  /**
   * Check if variable is valid user kind string
   *
   * @param {string} variable
   *
   * @return {boolean}
   */
  static validateUserKindString(variable) {
    return [tokenUserConstants.userKind, tokenUserConstants.companyKind].includes(variable);
  }

  static validateDdbNextPagePayload(variable) {
    if (typeof variable !== 'object') {
      return false;
    } else if (typeof variable['lastEvaluatedKey'] !== 'object') {
      return false;
    } else {
      return true;
    }
  }

  static validatePaginationIdentifier(key) {
    //TODO: Implement
    return true;
  }

  static validateEip712Signature(signature) {
    if (typeof signature !== 'string') {
      return false;
    }
    return /^0x[0-9a-fA-F]{64}$/.test(signature);
  }
}

module.exports = CommonValidator;
