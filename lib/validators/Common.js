'use strict';

const BigNumber = require('bignumber.js');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  apiSignatureConstants = require(rootPrefix + '/lib/globalConstant/apiSignature'),
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
   *
   * @return {boolean}
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
   * @param minAllowedLimit - min allowed
   * @param maxAllowedLimit - max allowed
   *
   * @return {Array<boolean, number>}
   */
  static validateAndSanitizeLimit(limit, defaultLimit, minAllowedLimit, maxAllowedLimit) {
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

    if (limit < minAllowedLimit || limit > maxAllowedLimit) {
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
    try {
      let variableInBn = new BigNumber(String(variable));
      // Variable is integer and its length is less than 37 digits
      if (variableInBn.isInteger() && variableInBn.toString(10).length <= 37) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  /**
   * Is integer non zero
   *
   * @param {String/Number} variable
   *
   * @return {boolean}
   */
  static validateNonZeroInteger(variable) {
    const oThis = this;

    if (oThis.validateInteger(variable)) {
      return Number(variable) > 0;
    }
    return false;
  }

  /**
   * Is integer non negative
   *
   * @param {String/Number} variable
   *
   * @return {boolean}
   */
  static validateNonNegativeInteger(variable) {
    const oThis = this;

    if (oThis.validateInteger(variable)) {
      return Number(variable) >= 0;
    }
    return false;
  }

  /**
   * Is integer zero
   *
   * @param {String/Number} variable
   *
   * @return {boolean}
   */
  static validateZeroInteger(variable) {
    const oThis = this;

    if (oThis.validateInteger(variable)) {
      return Number(variable) === 0;
    }
    return false;
  }

  /**
   * Is wei value greater than 0?
   *
   * @param {String/Number} variable
   *
   * @return {boolean}
   */
  static validateNonZeroWeiValue(variable) {
    try {
      let variableInBn = new BigNumber(String(variable));
      // Variable in wei is integer and its length is less than 37 digits
      if (variableInBn.gt(new BigNumber('0')) && variableInBn.isInteger() && variableInBn.toString(10).length <= 37) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  /**
   * Is wei value 0?
   *
   * @param {String/Number} variable
   *
   * @return {boolean}
   */
  static validateZeroWeiValue(variable) {
    try {
      let variableInBn = new BigNumber(String(variable));
      if (variableInBn.eq(new BigNumber('0')) && variableInBn.isInteger()) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  /**
   * Is string valid ?
   *
   * @return {Boolean}
   */
  static validateString(variable) {
    return typeof variable === 'string';
  }

  /**
   * Checks if the given string starts with 0x
   *
   * @param variable {String}
   *
   * @return {Boolean}
   */
  static validateHexString(variable) {
    const oThis = this;

    return /^0x[a-z0-9]{1,}$/i.test(variable);
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
   * Is var a string containing only alphabets ?
   *
   * @return {Boolean}
   *
   */
  static validateAlphaSpaceString(variable) {
    if (CommonValidator.isVarNull(variable)) {
      return false;
    }
    return /^[a-z\s]+$/i.test(variable);
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
    return /^[a-z0-9\s]+$/i.test(variable);
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
   * Is valid non zero integer Array
   *
   * @param {Array} array
   *
   * @return {Boolean}
   */
  static validateNonZeroIntegerArray(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        if (!CommonValidator.validateNonZeroInteger(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Is valid Array containing gte 0 wei values as string
   *
   * @param {Array} array
   *
   * @return {Boolean}
   */
  static validateWeiAmountArray(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        let variable = array[i];
        if (typeof variable !== 'string' || !CommonValidator.validateNonZeroWeiValue(variable)) {
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

    return /^0x[0-9a-f]{40}$/i.test(address);
  }

  /**
   * Checks if address is zero eth address or not
   *
   * @param address {String} address the given HEX address
   *
   * @return {Boolean}
   */
  static validateZeroEthAddress(address) {
    if (CommonValidator.validateEthAddress(address)) {
      return /^0x[0]{40}$/i.test(address);
    }
    return false;
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

    if (!oThis.isVarNull(transactionHash) && typeof transactionHash === 'string') {
      return /^0x[0-9a-fA-F]{64}$/.test(transactionHash);
    }

    return false;
  }

  /**
   * Check if personal sign api key is valid or not
   *
   * @param {string} variable - personal sign api key
   * @param {string} separator - personal sign api key separator
   *
   * @return {boolean}
   */
  static validatePersonalSignApiKey(variable, separator) {
    const oThis = this;

    if (typeof variable !== 'string') {
      return false;
    }

    if (!oThis.isVarNull(variable) && typeof variable === 'string') {
      let api_key_addresses = variable.split(separator);

      // Invalid token id
      let api_token_id = api_key_addresses[0];
      if (!api_token_id || !oThis.validateNonZeroInteger(api_token_id)) {
        return false;
      }

      // Invalid user id
      let api_user_id = api_key_addresses[1];
      if (!api_user_id || !oThis.validateUuidV4(api_user_id)) {
        return false;
      }

      // Invalid device address
      let api_device_address = api_key_addresses[2];
      if (!api_device_address || !oThis.validateEthAddress(api_device_address)) {
        return false;
      }

      // Invalid api personal signer address
      let api_personal_signer_address = api_key_addresses[3];
      if (!api_personal_signer_address || !oThis.validateEthAddress(api_personal_signer_address)) {
        return false;
      }
    }

    return true;
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

  /**
   * validate ddb next page payload
   *
   * @param variable
   *
   * @return {boolean}
   */
  static validateDdbNextPagePayload(variable) {
    if (typeof variable !== 'object') {
      return false;
    }
    return (
      typeof variable.lastEvaluatedKey === 'object' &&
      CommonValidator.validateNonZeroInteger(variable.limit) &&
      CommonValidator.validateNonZeroInteger(variable.page)
    );
  }

  /**
   * Validate pagination identifier.
   *
   * @param {String} key
   *
   * @return {Boolean}
   */
  static validateDdbPaginationIdentifier(key) {
    try {
      const paginationParams = basicHelper.decryptPageIdentifier(key);
      return CommonValidator.validateDdbNextPagePayload(paginationParams);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate EIP712 Signature
   *
   * @param signature
   *
   * @return {boolean}
   */
  static validateEip712Signature(signature) {
    if (typeof signature !== 'string') {
      return false;
    }
    return /^0x[0-9a-fA-F]{64}$/.test(signature);
  }

  /**
   * Validate Meta Properties while intsertion
   *
   * @param {Object} object
   *
   * @return {boolean}
   */
  static validateMetaPropertyForInsertion(object) {
    if (!CommonValidator.validateMetaProperty(object)) {
      return false;
    }

    // NOTE: Here we are checking length of meta property string here, for backward compatibility in future.
    if (object.hasOwnProperty('name') && object['name'].length > 25) {
      return false;
    }

    // NOTE: Here we are checking length of meta property string here, for backward compatibility in future.
    if (object.hasOwnProperty('details') && object['details'].length > 125) {
      return false;
    }

    return true;
  }

  /**
   * Validate Meta Properties while intsertion
   *
   * @param {Object} object
   *
   * @return {boolean}
   */
  static validateMetaProperty(object) {
    if (typeof object !== 'object') {
      return false;
    }
    let whitelistedKeysMap = { name: 1, type: 1, details: 1 };

    for (let key in object) {
      if (!whitelistedKeysMap[key]) {
        delete object[key];
      }
    }

    let whitelistedTypeMap = { company_to_user: 1, user_to_user: 1, user_to_company: 1 };

    if (object.hasOwnProperty('type') && !whitelistedTypeMap[object['type']]) {
      return false;
    }

    // NOTE: Here we are not checking length of meta property string. For backward compatibility in future.
    if (object.hasOwnProperty('name') && !CommonValidator.validateMetaPropertyName(object['name'])) {
      return false;
    }

    // NOTE: Here we are not checking length of meta property string. For backward compatibility in future.
    if (object.hasOwnProperty('details') && !CommonValidator.validateMetaPropertyDetails(object['details'])) {
      return false;
    }

    return true;
  }

  /**
   *
   * check if meta property name is valid
   *
   * @param name
   *
   * @return {boolean}
   */
  static validateMetaPropertyName(name) {
    if (typeof name !== 'string') {
      return false;
    }
    return /^[0-9a-z\s\-_]{1,}$/i.test(name);
  }

  /**
   *
   * check if meta property details is valid
   *
   * @param name
   * @return {boolean}
   */
  static validateMetaPropertyDetails(details) {
    if (typeof details !== 'string') {
      return false;
    }
    return /^[0-9a-z\s\-_]{1,}$/i.test(details);
  }

  /**
   * Validate API Signature Kind
   *
   * @param string
   *
   * @return {boolean}
   */
  static validateApiSignatureKind(string) {
    if (typeof string !== 'string') {
      return false;
    }
    return apiSignatureConstants.supportedKinds.includes(string);
  }

  /**
   * Validate API validateTransactionStatusArray
   *
   * @param Array<string> array
   *
   * @return {boolean}
   */
  static validateStringArray(array) {
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        if (!CommonValidator.validateAlphaString(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Validate Meta property array
   *
   * @param array
   *
   * @return {boolean}
   */
  static validateMetaPropertyArray(array) {
    // NOTE: Here we are not checking length of meta property string. For backward compatibility in future.
    if (Array.isArray(array) && array.length <= 10) {
      for (let i = 0; i < array.length; i++) {
        if (!CommonValidator.validateMetaProperty(array[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * validate ES next page payload
   *
   * @param variable
   *
   * @return {boolean}
   */
  static validateESNextPagePayload(variable) {
    if (typeof variable !== 'object') {
      return false;
    }
    // NOTE: Here we are not checking length of meta property string. For backward compatibility in future.
    return (
      CommonValidator.validateNonZeroInteger(variable.limit) &&
      CommonValidator.validateNonZeroInteger(variable.from) &&
      (variable.hasOwnProperty('status') && CommonValidator.validateStringArray(variable.status)) &&
      (variable.hasOwnProperty('meta_property') && CommonValidator.validateMetaPropertyArray(variable.meta_property))
    );
  }

  /**
   * check if paginationIdentifier is a valid encoded string
   * @param paginationIdentifier
   *
   * @return {boolean}
   */
  static validateEsPaginationIdentifier(paginationIdentifier) {
    try {
      const paginationParams = basicHelper.decryptPageIdentifier(paginationIdentifier);
      return CommonValidator.validateESNextPagePayload(paginationParams);
    } catch (error) {
      return false;
    }
  }
}

module.exports = CommonValidator;
