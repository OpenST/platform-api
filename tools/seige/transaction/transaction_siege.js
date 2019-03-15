'use strict';

// multi session transaction seige

const https = require('https'),
  OSTSDK = require('./index'),
  Package = require('../openst.js/index.js'),
  Web3 = require('web3'),
  web3 = new Web3();

let sdkLimit = 10;

https.globalAgent.keepAlive = true;
https.globalAgent.keepAliveMsecs = 60 * 10000;
https.globalAgent.maxSockets = 100;

let senders = [],
  receiverTokenHolders = [],
  sessionAddressMap = {};

const API_KEY = '',
  API_SECRET = '',
  API_END_POINT = '';

class TransactionSiege {
  async perform() {
    const oThis = this;

    await oThis._init();

    await oThis._getSessionKeyNonce();

    // TODO: token rule address
    let transferTo = '0xa31e988eebc89d0bc3e4a9a5463545ea534593e4',
      transferAmount = '1',
      raw_calldata = JSON.stringify({
        method: 'directTransfers',
        parameters: [[transferTo], [transferAmount]]
      });

    while (sdkLimit--) {
      let ostObj = new OSTSDK({
        apiKey: API_KEY,
        apiSecret: API_SECRET,
        apiEndpoint: API_END_POINT,
        config: { timeout: 100 }
      });

      let transactionsService = ostObj.services.transactions;

      for (let i = 0; i < senders.length; i++) {
        let senderId = senders[i],
          receiverTokenHolder = receiverTokenHolders[i];

        for (let j = 0; j < sessionAddressMap[senderId].length; j++) {
          let sessionAddress = sessionAddressMap[senderId][j];

          let executeParams = {
            user_id: senderId,
            to: receiverTokenHolder,
            signer: sessionAddress,
            raw_calldata: raw_calldata
          };

          let response = await transactionsService.execute(executeParams).catch(function(err) {});

          if (response.isSuccess()) {
          }
        }
      }
    }
  }

  async _init() {
    const oThis = this;
  }

  async _getSessionKeyNonce() {
    const oThis = this;

    oThis.sessionNonceMap = {};
  }

  async _signEIP1077Transaction() {
    const oThis = this;

    let TokenHolder = Package.Helpers.TokenHolder,
      Contracts = Package.Contracts,
      User = Package.Helpers.User,
      TokenRules = Package.Helpers.TokenRules,
      AbiBinProvider = Package.AbiBinProvider;
  }
}

let transactionSiege = new TransactionSiege();

transactionSiege
  .perform()
  .then(function(r) {
    console.log('====Siege iteration successful====');
    process.exit(0);
  })
  .catch(function(r) {
    console.log('====There seems to be an issue', r);
    process.exit(1);
  });
