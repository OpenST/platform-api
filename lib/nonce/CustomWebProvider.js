'use strict';

const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  OstWeb3 = OSTBase.OstWeb3,
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InstanceMap = {};

class CustomWebProvider {
  /**
   * get web3 instance which has custom methods for fetching nonce related data
   *
   * @param {string} gethURL - geth provider url
   * @param {string} chainClient - chain kind e.g geth, parity
   *
   */
  static getInstance(gethURL, chainClient) {
    const existingInstance = web3InstanceMap[gethURL];

    if (existingInstance) {
      logger.log('Using existing web3 Instance of gethURL - ' + gethURL + ' and chainClient ' + chainClient);
      return existingInstance;
    }

    logger.log('Creating new web3 Instance of gethURL - ' + gethURL + ' and chainClient ' + chainClient);

    const newInstance = new OstWeb3(gethURL, null, {
      providerOptions: {
        maxReconnectTries: 20,
        killOnReconnectFailure: false
      }
    });

    newInstance.chainClient = chainClient;

    switch (chainClient) {
      case configStrategyConstants.gethChainClient:
        newInstance.extend({
          methods: [
            {
              name: 'unminedTransactionsWithMoreData',
              call: 'txpool_content'
            },
            {
              name: 'unminedTransactionsWithLessData',
              call: 'txpool_inspect'
            }
          ]
        });
        break;

      case configStrategyConstants.parityChainClient:
        newInstance.extend({
          methods: [
            {
              name: 'unminedTransactionsWithMoreData',
              call: 'parity_pendingTransactions'
            },
            {
              name: 'unminedTransactionsWithLessData',
              call: 'parity_pendingTransactions'
            }
          ]
        });
        break;

      default:
        console.trace('unhandled chainClient found: ', chainClient);
        break;
    }

    web3InstanceMap[gethURL] = newInstance;

    return newInstance;
  }
}

module.exports = CustomWebProvider;
