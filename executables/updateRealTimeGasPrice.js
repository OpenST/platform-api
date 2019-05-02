/**
 * This script will update the gas price using ost-dynamic-gas-price package.
 * This fetches an estimated gas price for which Transaction could get mined in less than 5 minutes.
 * source: 'https://ethgasstation.info/txPoolReport.php'
 *
 * Usage:
 *
 * Command Line Parameters Description:
 * processLockId is used for ensuring that no other process with the same processLockId can run on a given machine.
 *
 * Example: node executables/updateRealTimeGasPrice.js --cronProcessId 2
 *
 * @module executables/updateRealtimeGasPrice
 */
const program = require('commander'),
  BigNumber = require('bignumber.js'),
  dynamicGasPriceProvider = require('@ostdotcom/ost-dynamic-gas-price');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  CronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  OriginChainGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainIdConst = require(rootPrefix + '/lib/globalConstant/chainId'),
  localChainConfig = require(rootPrefix + '/tools/localSetup/config'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  environmentConst = require(rootPrefix + '/lib/globalConstant/environmentInfo');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/updateRealTimeGasPrice.js --cronProcessId 2');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for update real time gas price cron.
 *
 * @class UpdateRealTimeGasPrice
 */
class UpdateRealTimeGasPrice extends CronBase {
  /**
   * Constructor for update real time gas price cron.
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
   * Start the executable.
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    oThis.canExit = false;

    let chainIdInternal =
      coreConstants.environment === environmentConst.environment.development
        ? localChainConfig.chains.origin.networkId.value
        : chainIdConst.getChainId();

    // Declare variables.
    let estimatedGasPriceFloat = 0,
      oneGWei = new BigNumber('1000000000'),
      defaultGasPriceGWei = new BigNumber(coreConstants.DEFAULT_ORIGIN_GAS_PRICE).div(oneGWei).toNumber(10),
      maxGasPriceGWei = new BigNumber(coreConstants.MAX_ORIGIN_GAS_PRICE).div(oneGWei).toNumber(10),
      originChainGasPriceCacheObj = new OriginChainGasPriceCache(),
      retryCount = 10;

    while (retryCount > 0 && estimatedGasPriceFloat === 0) {
      estimatedGasPriceFloat = await dynamicGasPriceProvider.dynamicGasPrice.get(chainIdInternal, defaultGasPriceGWei);
      retryCount -= 1;
    }

    // If estimated gas price is zero, this means none of the services used to fetch gas prices work. Send an alert in this scenario.
    if (estimatedGasPriceFloat == 0) {
      logger.error('e_urtgp_1', 'Dynamic gas price zero from services.');
      const errorObject = responseHelper.error({
        internal_error_identifier: 'dynamic_gas_price_zero:e_urtgp_1',
        api_error_identifier: 'dynamic_gas_price_zero',
        debug_options: {
          estimatedGasPrice: estimatedGasPriceFloat,
          threshold: defaultGasPriceGWei
        }
      });
      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
    }

    // If estimated gas price is greater than max gas price, send an alert in this scenario.
    // TODO - remove following hardcoding
    if (estimatedGasPriceFloat > 15) {
      logger.error('e_urtgp_2', 'Dynamic gas price is greater than max gas price.');
      const errorObject = responseHelper.error({
        internal_error_identifier: 'dynamic_gas_price_threshold_exceeded:e_urtgp_2',
        api_error_identifier: 'dynamic_gas_price_threshold_exceeded',
        debug_options: {
          estimatedGasPrice: estimatedGasPriceFloat,
          maxGasPriceGWei: maxGasPriceGWei
        }
      });
      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
    }

    // All constants will be stored in Gwei.
    if (estimatedGasPriceFloat > 0) {
      let estimatedGasPrice = Math.ceil(estimatedGasPriceFloat),
        gasPriceToBeSubmittedHex = null,
        estimatedGasPriceBN = new BigNumber(estimatedGasPrice),
        estimatedGasPriceBNInWei = estimatedGasPriceBN.mul(oneGWei);

      let minGasPriceBN = new BigNumber(coreConstants.MIN_ORIGIN_GAS_PRICE),
        maxGasPriceBN = new BigNumber(coreConstants.MAX_ORIGIN_GAS_PRICE),
        bufferGasBN = new BigNumber(coreConstants.BUFFER_ORIGIN_GAS_PRICE),
        gasPriceToBeSubmittedBN = estimatedGasPriceBNInWei.plus(bufferGasBN);

      if (gasPriceToBeSubmittedBN.lt(minGasPriceBN)) {
        gasPriceToBeSubmittedHex = '0x' + minGasPriceBN.toString(16);
        await originChainGasPriceCacheObj._setCache(gasPriceToBeSubmittedHex);
      } else if (gasPriceToBeSubmittedBN.gt(maxGasPriceBN)) {
        gasPriceToBeSubmittedHex = '0x' + maxGasPriceBN.toString(16);
        await originChainGasPriceCacheObj._setCache(gasPriceToBeSubmittedHex);
      } else {
        gasPriceToBeSubmittedHex = '0x' + gasPriceToBeSubmittedBN.toString(16);
        await originChainGasPriceCacheObj._setCache(gasPriceToBeSubmittedHex);
      }
      oThis.canExit = true;
      logger.info('Origin chain gas price cache is set to:', gasPriceToBeSubmittedHex);

      return responseHelper.successWithData(gasPriceToBeSubmittedHex);
    }

    logger.error(
      `Origin chain gas price cache is not set. Estimated gas price: ${estimatedGasPriceFloat}. Chain Id: ${chainIdInternal}`
    );
    oThis.canExit = true;

    return responseHelper.successWithData({});
  }

  /**
   * This function provides info whether the process has to exit.
   *
   * @returns {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Validate and sanitize.
   *
   * @private
   */
  async _validateAndSanitize() {
    return;
  }

  /**
   * Get cron kind.
   *
   * @returns {String}
   *
   * @private
   */
  get _cronKind() {
    return CronProcessesConstants.updateRealtimeGasPrice;
  }
}

// Perform action
new UpdateRealTimeGasPrice({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    setTimeout(function() {
      // Call StopProcess of CronProcessHandler.
      process.emit('SIGINT');
    }, 5000); // To kill the process after 5 seconds expecting that the cache will be set by then.
  })
  .catch(function() {
    process.emit('SIGINT');
  });
