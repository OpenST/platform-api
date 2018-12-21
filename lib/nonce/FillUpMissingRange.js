/**
 * This script is used to fill the missing nonce.
 *
 * @module executables/fire_brigade/fill_up_missing_nonce
 */

const rootPrefix = '../..',
  NonceHelper = require(rootPrefix + '/lib/nonce/Helper'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  FillUpMissingNonce = require(rootPrefix + '/lib/nonce/FillUpMissing');

class FillUpMissingNonceRange {
  /**
   * parameters
   *
   * @param {object} params - external passed parameters
   * @param {String} params.toAddress - to_address
   * @param {String} params.chainClient - chain_type (geth | parity)
   * @param {Integer} params.missing_nonce - missing_nonce
   * @param {array} params.gethProviders - geth_provider (WS | RPC)
   * @param {String} params.gasPrice - gas_price
   *
   *
   * @module executables/fire_brigade/fill_up_missing_nonce
   */
  constructor(params) {
    const oThis = this;
    oThis.toAddress = params.toAddress.toLowerCase();
    oThis.chainClient = params.chainClient;
    oThis.gasPrice = params.gasPrice;
    oThis.gethProviders = params.gethProviders;
    oThis.allPendingTasks = [];
    oThis.isProccessing = false;
    oThis.currentIndex = 0;
  }

  async perform() {
    const oThis = this;

    const clearQueuedResponse = await NonceHelper.clearAllMissingNonce(
      oThis.chainClient,
      oThis,
      oThis.fillNonce,
      oThis.gethProviders
    );
    if (clearQueuedResponse.isFailure()) {
      logger.error('Unable to clear queued transactions: ', clearQueuedResponse);
    } else {
      logger.win('Cleared queued transactions successfully: ', clearQueuedResponse);
    }
  }

  fillNonce(address, nonce) {
    const oThis = this,
      params = {};
    params['fromAddress'] = address.toLowerCase();
    params['toAddress'] = oThis.toAddress;
    params['chainClient'] = oThis.chainClient;
    params['missingNonce'] = parseInt(nonce);
    params['gasPrice'] = oThis.gasPrice;
    params['gethProvider'] = oThis.gethProviders[0];

    oThis.addToBatchProcess(params);
  }

  addToBatchProcess(object) {
    const oThis = this;
    oThis.allPendingTasks.push(object);
    if (!oThis.isProccessing) {
      oThis.isProccessing = true;
      oThis.batchProcess();
    }
    logger.info('------oThis.allPendingTasks.length: ', oThis.allPendingTasks.length);
  }

  async batchProcess() {
    const oThis = this;
    const batchSize = 100;
    while (oThis.currentIndex < oThis.allPendingTasks.length) {
      const allPromises = [];
      for (let count = 0; count < batchSize && oThis.currentIndex < oThis.allPendingTasks.length; count++) {
        const params = oThis.allPendingTasks[oThis.currentIndex];
        const promiseObject = new Promise(async function(onResolve, onReject) {
          const fillUpNonceObject = new FillUpMissingNonce(params);
          await fillUpNonceObject.perform();
          onResolve();
        });
        allPromises.push(promiseObject);
        oThis.currentIndex++;
      }

      await Promise.all(allPromises);
      logger.log('=======================Batch complete======================');
    }
    oThis.isProccessing = false;
  }
}
module.exports = FillUpMissingNonceRange;

/*


Below is the code to run on console. Update toAddress and chainClient below.
====================================================================\

var rootPrefix = '.';
var FillUpMissingNonceRangeKlass = require(rootPrefix + '/lib/nonce/FillUpMissingRange');
var fillUpObject = new FillUpMissingNonceRangeKlass({
   toAddress: '0x1a9d951062ea23e89c9f0c8e751981e5d93c7cb9',
   chainClient: 'geth',
   gasPrice: '0x3B9ACA00',
   gethProviders: ['ws://127.0.0.1:9546']
 }
);

fillUpObject.perform().then(console.log);

 */
