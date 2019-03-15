'use strict';

const rootPrefix = '../../..',
  SiegeUser = require(rootPrefix + '/app/models/mysql/SiegeUser');

const https = require('https'),
  OSTSDK = require('@ostdotcom/ost-sdk-js'),
  Web3 = require('web3'),
  web3 = new Web3();

const API_KEY = '',
  API_SECRET = '',
  API_END_POINT = '',
  TOKEN_RULE_ADDRESS = '',
  maxConnectionObjects = 20,
  NO_OF_TRANSFERS_IN_EACH_TRANSACTION = 3,
  PARALLEL_TRANSACTIONS = 20;

let maxIteration = 100,
  receiverTokenHolders = [];

https.globalAgent.keepAlive = true;
https.globalAgent.keepAliveMsecs = 60 * 10000;
https.globalAgent.maxSockets = 100;

class TransactionSiege {
  constructor() {}

  async perform() {
    const oThis = this;

    await oThis._init();

    for (let i = 0; i < receiverTokenHolders.length; i++) {
      receiverTokenHolders[i] = web3.utils.toChecksumAddress(receiverTokenHolders[i]);
    }

    let connectionObjects = [];
    for (let i = 0; i < maxConnectionObjects; i++) {
      let ostObj = new OSTSDK({
        apiKey: API_KEY,
        apiSecret: API_SECRET,
        apiEndpoint: API_END_POINT,
        config: { timeout: 100 }
      });
      connectionObjects.push(ostObj);
    }

    while (maxIteration--) {
      let promiseArray = [];

      for (let i = 0; i < receiverTokenHolders.length; i++) {
        let transferTos = receiverTokenHolders.slice(i, i + NO_OF_TRANSFERS_IN_EACH_TRANSACTION),
          transferAmounts = [],
          ostObj = connectionObjects[i % connectionObjects.length],
          transactionsService = ostObj.services.transactions;

        if (transferTos.length <= 0) continue;

        for (let j = 0; j < transferTos.length; j++) {
          transferAmounts.push('1');
        }

        let raw_calldata = JSON.stringify({
          method: 'directTransfers',
          parameters: [transferTos, transferAmounts]
        });

        let executeParams = {
          to: TOKEN_RULE_ADDRESS,
          raw_calldata: raw_calldata
        };

        promiseArray.push(
          await transactionsService.execute(executeParams).catch(function(err) {
            console.error('====Transaction failed from user:', receiverTokenHolders);
          })
        );

        if (i % PARALLEL_TRANSACTIONS == 0 || i - 1 == receiverTokenHolders.length) {
          await Promise.all(oThis.promiseArray);
          promiseArray = [];
        }
      }
    }
  }

  async _init() {
    const oThis = this;

    let siegeUser = new SiegeUser();

    let Rows = await siegeUser.select('*').fire();

    for (let i = 0; i < Rows.length; i++) {
      receiverTokenHolders.push(Rows[i].token_holder_contract_address);
    }

    // TODO: Santhosh. temp hard coding.
    receiverTokenHolders = [''];
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
