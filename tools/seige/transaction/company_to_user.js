'use strict';

const rootPrefix = '../../..',
  SiegeUser = require(rootPrefix + '/app/models/mysql/SiegeUser');

const https = require('https'),
  OSTSDK = require('@ostdotcom/ost-sdk-js'),
  Web3 = require('web3'),
  web3 = new Web3();

const API_KEY = '5f052a34a0f7292b2e44d51d4482fa3a',
  API_SECRET = 'fd75a2a05ce1325243db1416a8e00d0e6c39d8c5f9f5693e167b435f1501ffea',
  API_END_POINT = 'http://localhost:7001/testnet/v2/',
  TOKEN_RULE_ADDRESS = '0xb102717289cb805bdab41c804eb6ed023f638f3e',
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

    await oThis.runExecuteTransaction();
  }

  async _init() {
    const oThis = this;

    let siegeUser = new SiegeUser();

    let Rows = await siegeUser
      .select('*')
      .limit(PARALLEL_TRANSACTIONS)
      .fire();

    for (let i = 0; i < Rows.length; i++) {
      receiverTokenHolders.push(Rows[i].token_holder_contract_address);
    }

    // TODO: Santhosh. temp hard coding.
    receiverTokenHolders = ['0xa2d0f82b04cd4f8d7ae4dfb4851c8acafae5378d'];
  }

  async runExecuteTransaction() {
    const oThis = this;

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
          await Promise.all(promiseArray);
          promiseArray = [];
        }
      }
    }
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
