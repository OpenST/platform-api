'use strict';
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
 * Example: node executables/updateRealtimeGasPrice.js 1
 *
 * @module executables/updateRealtimeGasPrice
 */
const BigNumber = require('bignumber.js'),
  dynamicGasPriceProvider = require('@ostdotcom/ost-dynamic-gas-price');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainIdConst = require(rootPrefix + '/lib/globalConstant/chainId'),
  localChainConfig = require(rootPrefix + '/tools/localSetup/config'),
  environmentConst = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  CronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  originChainGasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

const usageDemo = function() {
  logger.log('Usage:', 'node executables/updateRealtimeGasPrice.js cronProcessId');
  logger.log('* cronProcessId is used for proper handling of cron.');
};

// Declare variables.
const args = process.argv,
  cronProcessId = parseInt(args[2]);

// Validate and sanitize the command line arguments.
if (!cronProcessId) {
  logger.error('Cron Process id NOT passed in the arguments.');
  usageDemo();
  process.exit(1);
}

class UpdateRealTimeGasPrice extends CronBase {
  /**
   *
   * @constructor
   */
  constructor() {
    let params = { cronProcessId: cronProcessId };
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
      originChainGasPriceCacheObj = new originChainGasPriceCacheKlass(),
      retryCount = 10;

    while (retryCount > 0 && estimatedGasPriceFloat === 0) {
      estimatedGasPriceFloat = await dynamicGasPriceProvider.dynamicGasPrice.get(chainIdInternal, defaultGasPriceGWei);
      retryCount = retryCount - 1;
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

    logger.info('Origin chain gas price cache is not set', estimatedGasPriceFloat, chainIdInternal);
    oThis.canExit = true;

    return responseHelper.successWithData({});
  }

  /**
   *
   * This function provides info whether the process has to exit.
   * @returns {string}
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   *
   * @private
   */
  _validateAndSanitize() {
    return;
  }

  /**
   *
   * @returns {string}
   * @private
   */
  get _cronKind() {
    return CronProcessesConstants.updateRealtimeGasPrice;
  }
}

const UpdateRealTimeGasPriceObj = new UpdateRealTimeGasPrice();

UpdateRealTimeGasPriceObj.perform().then(async function() {
  logger.info('Cron last run at: ', Date.now());
  setTimeout(function() {
    //Call StopProcess of CronProcessHandler
    process.emit('SIGINT');
  }, 5000); //To kill the process after 5 seconds expecting that the cache will be set by then.
});
