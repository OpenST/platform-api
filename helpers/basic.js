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

  convertToNormal(numInWei) {
    return this.convertToBigNumber(numInWei).div(this.convertToBigNumber(10).toPower(18));
  }

  convertToWei(num) {
    return this.convertToBigNumber(num).mul(this.convertToBigNumber(10).toPower(18));
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
    let maxGasValueInBigNumber = this.convertToBigNumber(coreConstants.MAX_VALUE_GAS_PRICE),
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
   * Check if amount is valid wei number and not zero
   *
   * @param {Number} amountInWei - amount in wei
   *
   * @return {boolean}
   */
  isWeiValid(amountInWei) {
    const oneForMod = new BigNumber('1');

    // Convert amount in BigNumber
    let bigNumAmount = null;
    if (amountInWei instanceof BigNumber) {
      bigNumAmount = amountInWei;
    } else {
      let numAmount = Number(amountInWei);
      if (!isNaN(numAmount)) {
        bigNumAmount = new BigNumber(amountInWei);
      }
    }

    return !(
      !bigNumAmount ||
      bigNumAmount.lessThan(1) ||
      bigNumAmount.isNaN() ||
      !bigNumAmount.isFinite() ||
      bigNumAmount.mod(oneForMod) != 0
    );
  }

  /**
   * Convert wei to proper string. Make sure it's a valid number
   *
   * @param {Number} amountInWei - amount in wei to be formatted
   *
   * @return {String}
   */
  formatWeiToString(amountInWei) {
    const oThis = this;
    return oThis.convertToBigNumber(amountInWei).toString(10);
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
   * Check if branded token name is valid or not
   *
   * @param {String} name - Branded token name
   *
   * @return {boolean}
   */
  isBTNameValid(name) {
    const oThis = this;
    if (typeof name !== 'string') {
      return false;
    }
    return /^[a-z0-9\s]{1,}$/i.test(name) && !oThis.hasStopWords(name);
  }

  /**
   * Check if transaction kind name is valid or not
   *
   * @param {String} name - Tx Kind name
   *
   * @return {boolean}
   */
  isTxKindNameValid(name) {
    if (typeof name !== 'string') {
      return false;
    }
    return /^[a-z0-9\s]{3,20}$/i.test(name);
  }

  /**
   * Check if user name is valid or not
   *
   * @param {String} name - username
   *
   * @return {boolean}
   */
  isUserNameValid(name) {
    const oThis = this;
    if (typeof name !== 'string') {
      return false;
    }
    return /^[a-z0-9\s]{3,20}$/i.test(name);
  }

  /**
   * Check if branded token symbol is valid or not
   *
   * @param {String} symbol - Branded token symbol
   *
   * @return {boolean}
   */
  isBTSymbolValid(symbol) {
    if (typeof symbol !== 'string') {
      return false;
    }
    return /^[a-z0-9]{3,4}$/i.test(symbol);
  }

  /**
   * Check if branded token conversion rate is valid or not
   *
   * @param {Number} conversionRate - Branded token conversion rate
   *
   * @return {boolean}
   */
  isBTConversionRateValid(conversionRate) {
    return !isNaN(conversionRate) && parseFloat(conversionRate) > 0;
  }

  /**
   * Check if uuid is valid or not
   *
   * @param {String} uuid - UUID of user, branded token etc.
   *
   * @return {boolean}
   */
  isUuidValid(uuid) {
    if (typeof uuid !== 'string') {
      return false;
    }

    return /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/.test(uuid);
  }

  /**
   * Check if Token UUID is valid or not (hex format)
   *
   * @param {String} uuid - Branded Token UUID
   *
   * @return {boolean}
   */
  isTokenUuidValid(uuid) {
    if (typeof uuid !== 'string') {
      return false;
    }
    return /^0x[0-9a-fA-F]{64}$/.test(uuid);
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
   * Check if string has stop words
   *
   * @param {String} string
   *
   * @return {boolean}
   */
  hasStopWords(string) {
    if (typeof string !== 'string') {
      return false;
    }
    let reg_ex = /\b(?:anal|anus|arse|ballsack|bitch|biatch|blowjob|blow job|bollock|bollok|boner|boob|bugger|bum|butt|buttplug|clitoris|cock|coon|crap|cunt|dick|dildo|dyke|fag|feck|fellate|fellatio|felching|fuck|f u c k|fudgepacker|fudge packer|flange|Goddamn|God damn|homo|jerk|Jew|jizz|Kike|knobend|knob end|labia|muff|nigger|nigga|penis|piss|poop|prick|pube|pussy|scrotum|sex|shit|s hit|sh1t|slut|smegma|spunk|tit|tosser|turd|twat|vagina|wank|whore|porn)\b/i;
    return reg_ex.test(string);
  }

  /**
   * Shuffle a array
   *
   * @param {Array} array
   *
   * @return {Array}
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i >= 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }

    return array;
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
   * check if number is already in wei
   * by checking if it is greater then min wei value
   *
   * @param {String} str
   *
   * @return {Array}
   */
  isGreaterThanMinWei(str) {
    return this.convertToBigNumber(str) >= this.convertToBigNumber(10).toPower(18);
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
   * Alert If ST Prime Balance is below this balance.
   *
   * @return {Map}
   *
   */
  reserveAlertBalanceWei() {
    const oThis = this;

    if (oThis.isMainSubEnvironment()) {
      return oThis.convertToWei(0.05);
    } else {
      return oThis.convertToWei(0.5);
    }
  }

  /**
   * ST Prime Balance to Transfer to Workers address
   *
   * @return {Map}
   *
   */
  transferSTPrimeToWorker() {
    const oThis = this;

    if (oThis.isMainSubEnvironment()) {
      return oThis.convertToWei(0.5);
    } else {
      return oThis.convertToWei(2);
    }
  }

  /**
   * ST Prime Balance to Transfer to Budget Holder address
   *
   * @return {Map}
   *
   */
  transferSTPrimeToBudgetHolder() {
    const oThis = this;

    if (oThis.isMainSubEnvironment()) {
      return oThis.convertToWei(0.05);
    } else {
      return oThis.convertToWei(1);
    }
  }

  /**
   * ST Prime Balance transfer if balance is below this balance.
   *
   * @return {Map}
   *
   */
  isSTPrimeTransferRequiredBal() {
    const oThis = this;

    if (oThis.isMainSubEnvironment()) {
      return oThis.convertToWei(0.01);
    } else {
      return oThis.convertToWei(0.5);
    }
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
   * Returns the index of workingProcesses array which needs to be used.
   *
   * @param {Number} fromUserId
   * @param {Array} workingProcesses
   * @returns {Object}
   */
  transactionDistributionLogic(fromUserId, workingProcesses) {
    let index = fromUserId % workingProcesses.length,
      workerUuid = workingProcesses[index].workerUuid;

    return { index: index, workerUuid: workerUuid };
  }

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
