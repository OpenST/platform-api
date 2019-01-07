'use strict';
/**
 * Check if aux and origin chain geth nodes are up and running
 *
 * @module tools/localSetup/gethChecker
 */
const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class for geth checker
 *
 * @class
 */
class GethChecker {
  /**
   * Constructor for geth checker.
   *
   * @param {String} wsProvider
   *
   * @constructor
   */
  constructor(wsProvider) {
    const oThis = this;

    oThis.chainEndpoint = wsProvider;
  }

  /**
   * Main performer for the class.
   *
   * @return {Promise<any>}
   */
  perform() {
    const oThis = this,
      promiseArray = [];

    promiseArray.push(oThis._isRunning(oThis.wsProvider));

    return Promise.all(promiseArray);
  }

  /**
   * Check if mentioned chain started mining and are ready
   *
   * @param {String} chainEndpoint
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  _isRunning(chainEndpoint) {
    const oThis = this,
      retryAttempts = 100,
      timerInterval = 5000,
      chainTimer = { timer: undefined, blockNumber: 0, retryCounter: 0 };

    const provider = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;

    return new Promise(function(onResolve, onReject) {
      chainTimer['timer'] = setInterval(function() {
        if (chainTimer['retryCounter'] <= retryAttempts) {
          provider.eth.getBlockNumber(function(err, blocknumber) {
            if (err) {
              logger.log('getBlockNumber err: ', err);
            } else {
              if (chainTimer['blockNumber'] != 0 && chainTimer['blockNumber'] != blocknumber) {
                logger.info('* Geth Checker - Chain with endpoint ' + chainEndpoint + ' has new blocks.');
                clearInterval(chainTimer['timer']);
                onResolve();
              }
              chainTimer['blockNumber'] = blocknumber;
            }
          });
        } else {
          logger.error('Geth Checker - Chain with endpoint ' + chainEndpoint + ' has no new blocks.');
          onReject();
          process.exit(1);
        }
        chainTimer['retryCounter']++;
      }, timerInterval);
    });
  }
}

module.exports = GethChecker;
