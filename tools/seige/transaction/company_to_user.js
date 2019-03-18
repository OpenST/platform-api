'use strict';

const rootPrefix = '../../..',
  SiegeUser = require(rootPrefix + '/app/models/mysql/SiegeUser');

const https = require('https'),
  OSTSDK = require('@ostdotcom/ost-sdk-js'),
  Web3 = require('web3'),
  web3 = new Web3();

const API_KEY = '43538ea77d5473371dbdfb8e773341f7',
  API_SECRET = '85217ad39713c51123f73a843df491218f50e997173d1c702be813451a3afb48',
  API_END_POINT = 'http://kit.developmentost.com:7001/testnet/v2/',
  TOKEN_RULE_ADDRESS = '0x2148e3f3256c96b21efe94d2e75afeb5bd207fc2',
  COMPANY_UUID = 'caf774d4-82e4-4bc7-a620-bdca52ac4ef5',
  maxConnectionObjects = 4;

let maxIteration = 10,
  NO_OF_USERS_COVERAGE = 5,
  PARALLEL_TRANSACTIONS = 2,
  NO_OF_TRANSFERS_IN_EACH_TRANSACTION = 1,
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
      .limit(NO_OF_USERS_COVERAGE)
      .fire();

    for (let i = 0; i < Rows.length; i++) {
      receiverTokenHolders.push(Rows[i].token_holder_contract_address);
    }
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
          user_id: COMPANY_UUID,
          to: TOKEN_RULE_ADDRESS,
          raw_calldata: raw_calldata,
          i: i + '-' + maxIteration
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
