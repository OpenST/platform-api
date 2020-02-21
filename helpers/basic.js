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
   * Convert wei value to un wei (normal).
   *
   * @param {string} wei
   *
   * @return {BigNumber}
   */
  convertWeiToNormal(wei) {
    return this.convertToBigNumber(wei).div(this.convertToBigNumber(10).toPower(18));
  }

  /**
   * Convert input to lower unit.
   *
   * @param {string/number} num
   * @param {number} decimals - decimals of the coin
   *
   * @return {BigNumber}
   */
  convertToLowerUnit(num, decimals) {
    return this.convertToBigNumber(num)
      .mul(this.convertToBigNumber(10).toPower(decimals))
      .floor();
  }

  /**
   * Convert lower unit value to normal.
   *
   * @param {string} wei
   * @param {Number} decimals
   *
   * @return {BigNumber}
   */
  convertLowerUnitToNormal(wei, decimals) {
    return this.convertToBigNumber(wei).div(this.convertToBigNumber(10).toPower(decimals));
  }

  /**
   * Convert wei value to un wei (normal).
   *
   * @param {string} wei
   * @param {number} decimals
   *
   * @return {string}
   */
  toNormalPrecisionBT(wei, decimals) {
    return this.toNormalPrecision(wei, 5, decimals);
  }

  /**
   * Convert wei value to un wei (normal).
   *
   * @param {string} wei
   * @param {number} decimals
   *
   * @return {string}
   */
  toNormalPrecisionFiat(wei, decimals) {
    return this.toNormalPrecision(wei, 2, decimals);
  }

  /**
   * Convert wei value to un wei (normal).
   *
   * @param {string} wei
   * @param {number} precision
   *
   * @return {string}
   */
  toPrecision(wei, precision) {
    const normalValue = this.convertToBigNumber(wei).div(this.convertToBigNumber(10).toPower(18));

    return normalValue.toFixed(precision, BigNumber.ROUND_HALF_UP).toString(10);
  }

  /**
   * Convert wei value to un wei (normal).
   *
   * @param {string} wei
   * @param {number} precision
   * @param {number} decimals
   *
   * @return {string}
   */
  toNormalPrecision(wei, precision, decimals) {
    const normalValue = this.convertToBigNumber(wei).div(this.convertToBigNumber(10).toPower(decimals));

    return normalValue.toFixed(precision, BigNumber.ROUND_HALF_UP).toString(10);
  }

  /**
   * Create a duplicate object.
   *
   * @return {object}
   */
  deepDup(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get the multiple of max gas price in origin with some buffer (example: 75Gwei will return '75')
   * Buffer right now is 1 Gwei.
   *
   * @return {string}
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
   * @return {string}
   */
  getAuxMaxGasPriceMultiplierWithBuffer() {
    const maxGasValueInBigNumber = this.convertToBigNumber(contractConstants.auxChainGasPrice),
      maxGasValueInString = maxGasValueInBigNumber.div(this.convertGweiToWei(1)).toString(10);

    return String(Number(maxGasValueInString) + coreConstants.AUX_GAS_BUFFER);
  }

  /**
   * Convert the given big number in Gwei to wei.
   *
   * @param {BigNumber} num
   */
  convertGweiToWei(num) {
    return this.convertToBigNumber(num).mul(this.convertToBigNumber(10).toPower(9));
  }

  /**
   * Convert wei to proper string. Make sure it's a valid number.
   *
   * @param {number} amountInWei: amount in wei to be formatted
   *
   * @return {string}
   */
  formatWeiToString(amountInWei) {
    const oThis = this;

    return oThis.convertToBigNumber(amountInWei).toString(10);
  }

  /**
   * Convert number to big number. Make sure it's a valid number.
   *
   * @param {number} number: number to be formatted
   *
   * @return {BigNumber}
   */
  convertToBigNumber(number) {
    return number instanceof BigNumber ? number : new BigNumber(number);
  }

  /**
   * Convert number to Hex.
   *
   * @param {number} number: number to be formatted
   *
   * @return {string}
   */
  convertToHex(number) {
    return '0x' + new BigNumber(number).toString(16).toUpperCase();
  }

  /**
   * Convert Hex to String.
   *
   * @param {string} string: Hex string
   *
   * @return {string}
   */
  convertHexToString(string) {
    const buf = new Buffer.from(string, 'hex');
    return buf.toString('utf8');
  }

  /**
   * Convert Hex to String.
   *
   * @param {string} string: Hex string
   *
   * @return {string}
   */
  convertStringToHex(string) {
    const buf = new Buffer.from(string, 'utf8');
    return buf.toString('hex');
  }

  /**
   * Check if address is valid or not.
   *
   * @param {string} address
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
   * Check if eth address is valid or not.
   *
   * @param {string} address
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
   * Check if eth address is valid or not.
   *
   * @param {string} address
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
   * Shuffle an array.
   *
   * @param {array} array
   *
   * @return {array}
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
   * Parse and regex replace processed links and user mention in slack payload
   *
   * @param payload
   * @returns {Object}
   */
  preprocessSlackPayload(params) {
    const oThis = this;

    if (typeof params === 'string') {
      params = params.replace(/<(http)([^>\s]*)>/gi, '$1$2');
      params = params.replace(/<mailto:([^>\|\s]*)\|+([^><\s]*)>/gi, '$1');
    } else if (typeof params === 'boolean' || typeof params === 'number' || params === null) {
      // Do nothing and return param as is.
    } else if (params instanceof Array) {
      for (const index in params) {
        params[index] = oThis.preprocessSlackPayload(params[index]);
      }
    } else if (params instanceof Object) {
      Object.keys(params).forEach(function(key) {
        params[key] = oThis.preprocessSlackPayload(params[key]);
      });
    } else if (!params) {
      // Do nothing and return param as is.
    } else {
      console.error('Invalid params type in payload: ', typeof params);
      params = '';
    }

    return params;
  }

  /**
   * Fetch Error Config.
   *
   * @param {string} apiVersion
   * @param {object} dynamicErrorConfig
   *
   * @return {object}
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
   * Convert a common separated string to array.
   *
   * @param {string} str
   *
   * @return {array}
   */
  commaSeperatedStrToArray(str) {
    return str.split(',').map((ele) => ele.trim());
  }

  /**
   * Check if environment is production.
   *
   * @return {boolean}
   */
  isProduction() {
    return coreConstants.environment === 'production';
  }

  /**
   * Check if environment is staging.
   *
   * @return {boolean}
   */
  isStaging() {
    return coreConstants.environment === 'staging';
  }

  /**
   * Check if environment is development.
   *
   * @return {boolean}
   */
  isDevelopment() {
    return coreConstants.environment === 'development';
  }

  /**
   * Check if sub environment is main.
   *
   * @return {boolean}
   */
  isMainSubEnvironment() {
    return coreConstants.subEnvironment === 'main';
  }

  /**
   * Check if sub environment is Sandbox.
   *
   * @return {boolean}
   */
  isSandboxSubEnvironment() {
    return coreConstants.subEnvironment === 'sandbox';
  }

  /**
   * Log date format.
   *
   * @returns {string}
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
   * @return {number}
   */
  getCurrentTimestampInSeconds() {
    return Math.floor(new Date().getTime() / 1000);
  }

  /**
   * Checks whether the object is empty or not.
   *
   * @param {object} obj
   *
   * @return {boolean}
   */
  isEmptyObject(obj) {
    for (const property in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, property)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get random number between the range of min and max.
   *
   * @param {number} min
   * @param {number} max
   *
   * @return {number}
   */
  getRandomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Encrypt page identifier.
   *
   * @param {string} object
   *
   * @return {string}
   */
  encryptPageIdentifier(object) {
    return base64Helper.encode(JSON.stringify(object));
  }

  /**
   * Decrypt page identifier.
   *
   * @param {string} string
   *
   * @return {any}
   */
  decryptPageIdentifier(string) {
    return JSON.parse(base64Helper.decode(string));
  }

  /**
   * Converts conversion rate to contract interpreted string. ex 1.5 -> 150000
   *
   * @param {string/number} conversionRate
   *
   * @return {string}
   */
  computeConversionRateForContract(conversionRate) {
    const conversionFactorFromDB = new BigNumber(conversionRate),
      conversionMultiplier = new BigNumber(coreConstants.STAKE_CURRENCY_TO_BT_CONVERSION_RATE_MULTIPLIER);
    const conversionRateForContractBigNumber = conversionFactorFromDB.mul(conversionMultiplier);

    return conversionRateForContractBigNumber.toString();
  }

  /**
   * Sanitize address.
   *
   * @param {string} address
   *
   * @return {string | *}
   */
  sanitizeAddress(address) {
    return address.toLowerCase();
  }

  /**
   * Sanitize uuid.
   *
   * @param {string} uuid
   *
   * @return {string | *}
   */
  sanitizeuuid(uuid) {
    return uuid.toLowerCase();
  }

  /**
   * Convert date to timestamp.
   *
   * @param {string} dateStr
   *
   * @return {number} timestamp
   */
  dateToSecondsTimestamp(dateStr) {
    return Math.floor(new Date(dateStr).getTime() / 1000);
  }

  /**
   * Promisify JSON parse.
   *
   * @param {object} data
   *
   * @return {Promise<void>}
   */
  async promisifyJsonParse(data) {
    return JSON.parse(data || '');
  }

  /**
   * Sanitize raw call data.
   *
   * @param rawCallData
   *
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
   * Sanitize meta property data.
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
          params_error_identifiers: ['invalid_meta_properties'],
          debug_options: {}
        })
      );
    });
  }

  /**
   * Get number of BT from fiat amount.
   *
   * @param {string} fiatAmount
   * @param {string} fiatAmountConversionInUsd
   * @param {string} stakeCurrencyIsHowManyFiat
   * @param {string} tokenConversionFactor
   * @param {number} tokenDecimals
   *
   * @returns {BigNumber}
   */
  getNumberOfBTFromFiat(
    fiatAmount,
    fiatAmountConversionInUsd,
    stakeCurrencyIsHowManyFiat,
    tokenConversionFactor,
    tokenDecimals
  ) {
    // This will give fiat amount in USD.
    const fiatAmountInUsd = (new BigNumber(fiatAmount)).div(new BigNumber(fiatAmountConversionInUsd));

    // This will give number of stake currency tokens from fiat amount.
    const inStakeCurrency = fiatAmountInUsd.div(new BigNumber(stakeCurrencyIsHowManyFiat));

    // From number of stake currency tokens fetch BT amount.
    const numberOfBts = (new BigNumber(inStakeCurrency)).mul(new BigNumber(tokenConversionFactor));

    return numberOfBts.mul((new BigNumber(10)).toPower(tokenDecimals)).floor();
  }

  /**
   * Timestamp in seconds.
   *
   * @return {number}
   */
  timestampInSeconds() {
    return Math.floor(new Date() / 1000);
  }

  /**
   * Generate rsv from signature.
   *
   * @param {string} signature
   *
   * @return {{r: string, s: string, v: string}}
   */
  generateRsvFromSignature(signature) {
    return {
      r: signature.slice(0, 66),
      s: `0x${signature.slice(66, 130)}`,
      v: `0x${signature.slice(130, 132)}`
    };
  }

  /**
   * Sleep for particular time.
   *
   * @param {number} ms: time in ms
   *
   * @returns {Promise<any>}
   */
  sleep(ms) {
    console.log('Sleeping for ', ms, ' ms');

    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = new BasicHelper();
