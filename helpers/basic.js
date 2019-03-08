/**
 * Perform basic validations
 *
 * @module helpers/basic
 */

const BigNumber = require('bignumber.js');

const rootPrefix = '..',
  base64Helper = require(rootPrefix + '/lib/base64Helper'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  apiErrorConfig = require(rootPrefix + '/config/apiParams/apiErrorConfig'),
  v2ParamErrorConfig = require(rootPrefix + '/config/apiParams/v2/errorConfig'),
  internalParamErrorConfig = require(rootPrefix + '/config/apiParams/internal/errorConfig');

/**
 * Class for basic helper.
 *
 * @class BasicHelper
 */
class BasicHelper {
  /**
   * Convert input to Weis.
   *
   * @param {String/Number} num
   *
   * @return {BigNumber}
   */
  convertToWei(num) {
    return this.convertToBigNumber(num).mul(this.convertToBigNumber(10).toPower(18));
  }

  /**
   * Convert wei value to un wei (normal)
   *
   * @param {String} wei
   *
   * @return {BigNumber}
   */
  convertWeiToNormal(wei) {
    return this.convertToBigNumber(wei).div(this.convertToBigNumber(10).toPower(18));
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
    const maxGasValueInBigNumber = this.convertToBigNumber(coreConstants.MAX_ORIGIN_GAS_PRICE),
      maxGasValueInString = maxGasValueInBigNumber.div(this.convertGweiToWei(1)).toString(10);

    return String(Number(maxGasValueInString) + coreConstants.ORIGIN_GAS_BUFFER);
  }

  /**
   * Get the multiple of max gas price in aux with some buffer (example: 75Gwei will return '75')
   * Buffer right now is 1 Gwei.
   *
   * @return {String}
   */
  getAuxMaxGasPriceMultiplierWithBuffer() {
    const maxGasValueInBigNumber = this.convertToBigNumber(contractConstants.auxChainGasPrice),
      maxGasValueInString = maxGasValueInBigNumber.div(this.convertGweiToWei(1)).toString(10);

    return String(Number(maxGasValueInString) + coreConstants.AUX_GAS_BUFFER);
  }

  /**
   * Convert the given big number in Gwei to wei
   * @param {BigNumber} num
   */
  convertGweiToWei(num) {
    return this.convertToBigNumber(num).mul(this.convertToBigNumber(10).toPower(9));
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
   * Shuffle a array
   *
   * @param {Array} array
   *
   * @return {Array}
   */
  shuffleArray(array) {
    for (let elementOne = array.length - 1; elementOne >= 0; elementOne--) {
      const elementTwo = Math.floor(Math.random() * (elementOne + 1));
      const temp = array[elementOne];
      array[elementOne] = array[elementTwo];
      array[elementTwo] = temp;
    }

    return array;
  }

  /**
   * Fetch Error Config
   *
   * @param {String} apiVersion
   * @param {Object} dynamicErrorConfig
   *
   * @return {Object}
   */
  fetchErrorConfig(apiVersion, dynamicErrorConfig) {
    let paramErrorConfig;

    if (apiVersion === apiVersions.v2) {
      paramErrorConfig = dynamicErrorConfig
        ? Object.assign(dynamicErrorConfig, v2ParamErrorConfig)
        : v2ParamErrorConfig;
    } else if (apiVersion === apiVersions.internal) {
      paramErrorConfig = dynamicErrorConfig
        ? Object.assign(dynamicErrorConfig, internalParamErrorConfig)
        : internalParamErrorConfig;
    } else if (apiVersion === apiVersions.general) {
      paramErrorConfig = {};
    } else {
      throw new Error(`Unsupported API Version ${apiVersion}`);
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
   * Check if sub environment is main
   *
   * @return {Boolean}
   */
  isProduction() {
    return coreConstants.environment == 'production';
  }

  /**
   * Check if sub environment is main
   *
   * @return {Boolean}
   */
  isMainSubEnvironment() {
    return coreConstants.subEnvironment == 'main';
  }

  /**
   * Check if sub environment is Sandbox
   *
   * @return {Boolean}
   */
  isSandboxSubEnvironment() {
    return coreConstants.subEnvironment == 'sandbox';
  }

  /**
   * Log date format
   *
   * @returns {String}
   */
  logDateFormat() {
    const date = new Date();

    return (
      date.getFullYear() +
      '-' +
      (date.getMonth() + 1) +
      '-' +
      date.getDate() +
      ' ' +
      date.getHours() +
      ':' +
      date.getMinutes() +
      ':' +
      date.getSeconds() +
      '.' +
      date.getMilliseconds()
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
    for (const property in obj) {
      if (obj.hasOwnProperty(property)) {
        return false;
      }
    }

    return true;
  }

  /**
   *
   * @param {Number} min
   * @param {Number} max
   *
   * @return {Number}
   */
  getRandomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Encypt page identifier
   *
   * @param object
   * @return {*}
   */
  encryptPageIdentifier(object) {
    return base64Helper.encode(JSON.stringify(object));
  }

  /**
   * Decrypt page identifier
   *
   * @param string
   * @return {any}
   */
  decryptPageIdentifier(string) {
    return JSON.parse(base64Helper.decode(string));
  }

  /**
   * Converts conversion rate to contract interpreted string. ex 1.5 -> 150000
   * @param conversionRate
   * @return {String}
   */
  computeConversionRateForContract(conversionRate) {
    const conversionFactorFromDB = new BigNumber(conversionRate),
      conversionMultiplier = new BigNumber(coreConstants.CONVERSION_RATE_MULTIPLIER);
    const conversionRateForContractBigNumber = conversionFactorFromDB.mul(conversionMultiplier);

    return conversionRateForContractBigNumber.toString();
  }

  /**
   * Sanitize address
   *
   * @param address
   * @return {string | *}
   */
  sanitizeAddress(address) {
    return address.toLowerCase();
  }

  /**
   * Sanitize uuid
   *
   * @param uuid
   * @return {string | *}
   */
  sanitizeuuid(uuid) {
    return uuid.toLowerCase();
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

  /**
   * Promisify JSON parse
   *
   * @return {Promise<void>}
   */
  async promisifyJsonParse(data) {
    return JSON.parse(data || '');
  }

  /**
   * Sanitize raw call data
   *
   * @param rawCallData
   * @return {Promise<void>}
   */
  async sanitizeRawCallData(rawCallData) {
    const oThis = this;

    return oThis.promisifyJsonParse(rawCallData).catch(function() {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'h_b_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata'],
          debug_options: {}
        })
      );
    });
  }

  /**
   * Sanitize meta property data
   *
   * @param metaProperty
   *
   * @return {Promise<void>}
   */
  async sanitizeMetaPropertyData(metaProperty) {
    const oThis = this;

    return oThis.promisifyJsonParse(metaProperty).catch(function() {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'h_b_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_meta_property'],
          debug_options: {}
        })
      );
    });
  }

  /**
   * Timestamp in seconds
   *
   * @return {Number}
   */
  timestampInSeconds() {
    return Math.floor(new Date() / 1000);
  }

  /**
   * Generate rsv from signature
   *
   * @param signature
   * @return {{r: *, s: string, v: string}}
   */
  generateRsvFromSignature(signature) {
    return {
      r: signature.slice(0, 66),
      s: `0x${signature.slice(66, 130)}`,
      v: `0x${signature.slice(130, 132)}`
    };
  }

  /**
   * Sleep for particular time
   *
   * @param ms {Number}: time in ms
   *
   * @returns {Promise<any>}
   */
  sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = new BasicHelper();
