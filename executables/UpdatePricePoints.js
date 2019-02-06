'use strict';
/**
 * This script will update price oracle price points using ost-price-oracle npm package.
 * This fetches OST Current price in given currency from coin market cap and sets it in price oracle.
 *
 * Usage: node executables/UpdatePricePoints.js --cronProcessId 13
 *
 * @module executables/UpdatePricePoints
 *
 * This cron expects auxChainId and quoteCurrency in cron params. quoteCurrency is an optional parameter.
 */

const program = require('commander');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  UpdatePricePoints = require(rootPrefix + '/app/services/conversionRates/UpdatePricePoints');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/UpdatePricePoints.js --cronProcessId 13');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class to update price oracle price points periodically.
 *
 * @class
 */
class UpdatePriceOraclePricePoints extends CronBase {
  /**
   * Class to update price oracle price points periodically.
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.updatePriceOraclePricePoints;
  }

  /**
   * Validate and sanitize
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.auxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_upp_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId }
        })
      );
    }
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Start the cron.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    logger.step('Validating quoteCurrency.');
    oThis._validateQuoteCurrency();

    logger.step('Update price points.');
    await oThis._updatePricePoint();

    logger.step('Cron completed.');
  }

  /**
   * Validate if quoteCurrency is valid.
   *
   * @return {Promise<never> | Promise<any>}
   *
   * @private
   */
  _validateQuoteCurrency() {
    const oThis = this;

    if (oThis.quoteCurrency && !conversionRateConstants.invertedKinds[oThis.quoteCurrency]) {
      logger.error('Please pass a valid quote currency.');
      return Promise.reject();
    }
  }

  async _updatePricePoint() {
    const oThis = this,
      updatePricePoints = new UpdatePricePoints({
        auxChainId: oThis.auxChainId,
        quoteCurrency: oThis.quoteCurrency
      });

    await updatePricePoints.perform();
  }
}

// Perform action
new UpdatePriceOraclePricePoints({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
