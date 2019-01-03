'use strict';

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic');

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

    if (!oThis.isVarNull(arbitrary_commission) && !oThis.isValidBoolean(arbitrary_commission)) {
      return false;
    }

    if (oThis.isVarTrue(arbitrary_commission) && !oThis.isVarNull(commission_percent)) {
      return false;
    }

    if (oThis.isVarFalse(arbitrary_commission)) {
      if (oThis.isVarNull(commission_percent)) {
        return false;
      } else if (!oThis.commissionPercentValid(commission_percent)) {
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
  static commissionPercentValid(commission_percent) {
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
    if (!oThis.isVarNull(arbitrary_amount) && !oThis.isValidBoolean(arbitrary_amount)) {
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
   * Validation for BT amount
   *
   * @param amount
   * @returns {boolean}
   */
  static validateBtAmount(amount) {
    const oThis = this;

    if (oThis.isVarNull(amount)) {
      return true;
    }

    // amount = amount.trim();

    if (isNaN(parseFloat(amount)) || amount < 0.00001 || amount > 100) {
      return false;
    }
    return true;
  }

  /**
   * Validation for USD amount
   *
   * @param amount
   * @returns {boolean}
   */
  static validateUsdAmount(amount) {
    const oThis = this;

    if (oThis.isVarNull(amount)) {
      return true;
    }

    // amount = amount.trim();

    if (isNaN(parseFloat(amount)) || amount < 0.01 || amount > 100) {
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
   * @param limit
   * @return {Array<boolean, number>}
   */
  static validateAndSanitizeLimit(limit) {
    const oThis = this;

    if (oThis.isVarNull(limit)) {
      return [true, 10];
    }

    if (!limit) {
      return [false, 0];
    }

    if (isNaN(parseInt(limit))) {
      return [false, 0];
    }

    if (limit < 1 || limit > 100) {
      return [false, 0];
    }

    if (parseInt(limit) != limit) {
      return [false, 0];
    }

    return [true, parseInt(limit)];
  }

  /**
   * Validation for USD amount
   *
   * @param amount
   * @returns {boolean}
   */
  static validateAmount(amount) {
    if (isNaN(parseFloat(amount)) || amount < 0) {
      return false;
    }
    return true;
  }

  /**
   *
   * Is valid Boolean
   *
   * @return {Boolean}
   *
   */
  static isValidBoolean(str) {
    const oThis = this;

    if (oThis.isVarNull(str)) {
      return false;
    } else if (str === 'true' || str === 'false' || str === true || str === false) {
      return true;
    } else {
      return false;
    }
  }

  /**
   *
   * Is var null ?
   *
   * @return {Boolean}
   *
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
  static isVarInteger(variable) {
    return typeof variable === 'number' && variable % 1 === 0;
  }

  /**
   *
   * Is valid Boolean
   *
   * @return {Boolean}
   *
   */
  static isValidOrderingString(str) {
    return ['asc', 'desc'].includes(str.toLowerCase());
  }

  /**
   *
   * Is valid UUID Array
   *
   * @param {Array} array
   *
   * @return {Boolean}
   *
   */
  static isValidUuidArray(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        if (!basicHelper.isUuidValid(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
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
}

module.exports = CommonValidator;
