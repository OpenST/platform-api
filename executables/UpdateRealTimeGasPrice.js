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

const dynamicGasPriceProvider = require('@ostdotcom/ost-dynamic-gas-price'),
  BigNumber = require('bignumber.js');

const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  StrategyByChainIdHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  CronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  originChainGasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/estimateOriginChainGasPrice');

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
  }

  /**
   *
   * @returns {Promise<any>}
   * @private
   */
  async _start() {
    const oThis = this,
      strategyByGroupHelperObj = new StrategyByChainIdHelper(oThis.chainId, oThis.groupId),
      configStrategyResp = await strategyByGroupHelperObj.getForKind(configStrategyConstants.originConstants);

    let configStrategy = configStrategyResp.data,
      chainIdInternal = configStrategy.originConstants.networkId;

    // Declare variables.
    let estimatedGasPriceFloat = 0,
      originChainGasPriceCacheObj = new originChainGasPriceCacheKlass(),
      retryCount = 10;

    while (retryCount > 0 && estimatedGasPriceFloat === 0) {
      estimatedGasPriceFloat = await dynamicGasPriceProvider.dynamicGasPrice.get(chainIdInternal);
      retryCount = retryCount - 1;
    }
    // All constants will be stored in Gwei.
    if (estimatedGasPriceFloat > 0) {
      let estimatedGasPrice = Math.ceil(estimatedGasPriceFloat),
        gasPriceToBeSubmittedHex = null,
        estimatedGasPriceBN = new BigNumber(estimatedGasPrice),
        estimatedGasPriceBNInWei = estimatedGasPriceBN.mul(1000000000);

      let minGasPriceBN = new BigNumber(coreConstants.MIN_VALUE_GAS_PRICE),
        maxGasPriceBN = new BigNumber(coreConstants.MAX_VALUE_GAS_PRICE),
        bufferGasBN = new BigNumber(coreConstants.BUFFER_VALUE_GAS_PRICE),
        gasPriceToBeSubmittedBN = estimatedGasPriceBNInWei.plus(bufferGasBN);

      if (gasPriceToBeSubmittedBN.lt(minGasPriceBN)) {
        gasPriceToBeSubmittedHex = '0x' + minGasPriceBN.toString(16);
        originChainGasPriceCacheObj._setCache(gasPriceToBeSubmittedHex);
      } else if (gasPriceToBeSubmittedBN.lt(maxGasPriceBN)) {
        gasPriceToBeSubmittedHex = '0x' + gasPriceToBeSubmittedBN.toString(16);
        originChainGasPriceCacheObj._setCache(gasPriceToBeSubmittedHex);
      } else {
        gasPriceToBeSubmittedHex = '0x' + maxGasPriceBN.toString(16);
        originChainGasPriceCacheObj._setCache(gasPriceToBeSubmittedHex);
      }
      logger.info('Origin chain gas price cache is set to:', gasPriceToBeSubmittedHex);
      return Promise.resolve(responseHelper.successWithData(gasPriceToBeSubmittedHex));
    }
    logger.info('Origin chain gas price cache is not set');
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * This function provides info whether the process has to exit.
   * @returns {string}
   * @private
   */
  _pendingTasksDone() {
    return 'true';
  }

  /**
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;
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
