'use strict';

/**
 * Perform basic validations
 *
 * @module helpers/basic
 */

const BigNumber = require('bignumber.js');

const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  apiErrorConfig = require(rootPrefix + '/config/apiParams/apiErrorConfig'),
  v2ParamErrorConfig = require(rootPrefix + '/config/apiParams/v2/errorConfig'),
  base64Helper = require(rootPrefix + '/lib/base64Helper'),
  internalParamErrorConfig = require(rootPrefix + '/config/apiParams/internal/errorConfig');

class BasicHelperKlass {
  /**
   * Basic helper methods constructor
   *
   * @constructor
   *
   */
  constructor() {}

  convertToWei(num) {
    return this.convertToBigNumber(num).mul(this.convertToBigNumber(10).toPower(18));
  }

  /**
   * Fetch hostname of machine.
   *
   * @return {*}
   */
  fetchHostnameOfMachine() {
    const shell = require('shelljs'),
      localSetupHelper = require(rootPrefix + '/tools/localSetup/helper');

    const hostnameEntity = localSetupHelper.handleShellResponse(shell.exec('hostname')),
      hostName = hostnameEntity.stdout;

    return hostName.replace(/\n$/, '');
  }

  /**
   * Create a duplicate object
   *
   * @return {Object}
   */
  deepDup(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get the multiple of max gas price in origin with some buffer (example: 75Gwei will return '75')
   * Buffer right now is 1 Gwei.
   *
   * @return {String}
   */
  getOriginMaxGasPriceMultiplierWithBuffer() {
    let maxGasValueInBigNumber = this.convertToBigNumber(coreConstants.MAX_ORIGIN_GAS_PRICE),
      maxGasValueInString = maxGasValueInBigNumber.div(this.convertGweiToWei(this.convertToBigNumber(1))).toString(10);

    return String(Number(maxGasValueInString) + 1);
  }

  /**
   * Convert the given big number in Gwei to wei
   * @param {BigNumber} num
   */
  convertGweiToWei(num) {
    return num.mul(this.convertToBigNumber(10).toPower(9));
  }

  /**
   * Convert number to big number. Make sure it's a valid number
   *
   * @param {Number} number - number to be formatted
   *
   * @return {BigNumber}
   */
  convertToBigNumber(number) {
    return number instanceof BigNumber ? number : new BigNumber(number);
  }

  /**
   * Convert number to Hex
   *
   * @param {Number} number - number to be formatted
   *
   * @return {BigNumber}
   */
  convertToHex(number) {
    return '0x' + new BigNumber(number).toString(16).toUpperCase();
  }

  /**
   * Check if address is valid or not
   *
   * @param {String} address - Address
   *
   * @return {boolean}
   */
  isAddressValid(address) {
    if (typeof address !== 'string') {
      return false;
    }
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  /**
   * Check if eth address is valid or not
   *
   * @param {String} address - address
   *
   * @return {boolean}
   */
  isEthAddressValid(address) {
    if (typeof address !== 'string') {
      return false;
    }
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  /**
   * Check if eth address is valid or not
   *
   * @param {String} address - address
   *
   * @return {boolean}
   */
  isTxHashValid(txHash) {
    if (typeof txHash !== 'string') {
      return false;
    }
    return /^0x[0-9a-fA-F]{64}$/.test(txHash);
  }

  /**
   * Fetch Error Config
   *
   * @param {String} apiVersion
   *
   * @return {Object}
   */
  fetchErrorConfig(apiVersion) {
    let paramErrorConfig;

    if (apiVersion === apiVersions.v2) {
      paramErrorConfig = v2ParamErrorConfig;
    } else if (apiVersion === apiVersions.internal) {
      paramErrorConfig = internalParamErrorConfig;
    } else if (apiVersion === apiVersions.general) {
      paramErrorConfig = {};
    } else {
      throw 'unsupported API Version ' + apiVersion;
    }

    return {
      param_error_config: paramErrorConfig,
      api_error_config: apiErrorConfig
    };
  }

  /**
   * Convert a common separated string to array
   *
   * @param {String} str
   *
   * @return {Array}
   */
  commaSeperatedStrToArray(str) {
    return str.split(',').map((ele) => ele.trim());
  }

  /**
   * check if sub environment is main
   *
   * @return {Boolean}
   */
  isProduction() {
    return coreConstants.environment == 'production';
  }

  /**
   * check if sub environment is main
   *
   * @return {Boolean}
   */
  isMainSubEnvironment() {
    return coreConstants.subEnvironment == 'main';
  }

  /**
   * check if sub environment is Sandbox
   *
   * @return {Boolean}
   */
  isSandboxSubEnvironment() {
    return coreConstants.subEnvironment == 'sandbox';
  }

  /**
   *
   * Pauses flow of execution for a few milliseconds.
   *
   * @param timeInMilliSeconds
   * @returns {Promise<any>}
   */
  async pauseForMilliSeconds(timeInMilliSeconds) {
    return new Promise(function(onResolve) {
      setTimeout(function() {
        onResolve();
      }, timeInMilliSeconds);
    });
  }

  /**
   * Log date format
   *
   * @returns {string}
   */
  logDateFormat() {
    const d = new Date();
    return (
      d.getFullYear() +
      '-' +
      (d.getMonth() + 1) +
      '-' +
      d.getDate() +
      ' ' +
      d.getHours() +
      ':' +
      d.getMinutes() +
      ':' +
      d.getSeconds() +
      '.' +
      d.getMilliseconds()
    );
  }

  /**
   * Get current timestamp in seconds.
   *
   * @return {Number}
   */
  getCurrentTimestampInSeconds() {
    return Math.floor(new Date().getTime() / 1000);
  }

  /**
   * Checks whether the object is empty or not.
   *
   * @param {Object} obj
   *
   * @return {Boolean}
   */
  isEmptyObject(obj) {
    for (let property in obj) {
      if (obj.hasOwnProperty(property)) return false;
    }

    return true;
  }

  /**
   *
   * @param {number} min
   * @param {number} max
   * @return {number}
   */
  getRandomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  encryptNextPagePayload(object) {
    return base64Helper.encode(JSON.stringify(object));
  }

  decryptNextPagePayload(string) {
    return JSON.parse(base64Helper.decode(string));
  }

  /**
   * Converts conversion rate to contract interpreted string. ex 1.5 -> 150000
   * @param conversionRate
   * @return {string}
   */
  computeConversionRateForContract(conversionRate) {
    let conversionFactorFromDB = new BigNumber(conversionRate),
      conversionMultiplier = new BigNumber(coreConstants.CONVERSION_RATE_MULTIPLIER);
    let conversionRateForContractBigNumber = conversionFactorFromDB.mul(conversionMultiplier);
    return conversionRateForContractBigNumber.toString();
  }

  sanitizeAddress(address) {
    return address.toLowerCase();
  }

  /**
   *
   * @param {String} dateStr
   * @return {Integer} timestamp
   *
   */
  dateToSecondsTimestamp(dateStr) {
    return Math.floor(new Date(dateStr).getTime() / 1000);
  }
}

module.exports = new BasicHelperKlass();
