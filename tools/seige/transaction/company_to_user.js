'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SiegeUser = require(rootPrefix + '/app/models/mysql/SiegeUser');

const https = require('https'),
  OSTSDK = require('@ostdotcom/ost-sdk-js'),
  Web3 = require('web3'),
  web3 = new Web3();

program
  .option('--apiKey <apiKey>', 'API KEY')
  .option('--apiSecret <apiSecret>', 'API Secret')
  .option('--tokenRulesAddress <tokenRulesAddress>', 'tokenRulesAddress')
  .option('--companyUuid <companyUuid>', 'tokenRulesAddress')
  .option('--tokenId <tokenId>', 'tokenId')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node tools/seige/transaction/company_to_user.js --apiKey <> --apiSecret <> --tokenRulesAddress <> --companyUuid <>'
  );
  logger.log('');
  logger.log('');
});

const API_KEY = program.apiKey, //'7cc96ecdaf395f5dcfc005a9df31e798',
  API_SECRET = program.apiSecret, //'38f6a48c63b5b4decbc8e56b29499e2c77ad14ae1cb16f4432369ffdfccb0bbf',
  TOKEN_RULE_ADDRESS = program.tokenRulesAddress, //'0xbfd29a0f8d56bee16a68c5156e496f032ede28e9',
  COMPANY_UUID = program.companyUuid, //'f65aa896-232b-4d62-b326-e8a38e207469',
  tokenId = program.tokenId,
  API_END_POINT = 'https://s6-api.stagingost.com/mainnet/v2',
  maxConnectionObjects = 4;

let maxIteration = 100,
  NO_OF_USERS_COVERAGE = 500,
  PARALLEL_TRANSACTIONS = 25, //Company has 10 session addresses.
  NO_OF_TRANSFERS_IN_EACH_TRANSACTION = 3,
  receiverTokenHolders = [],
  sigintReceived = 0;

https.globalAgent.keepAlive = true;
https.globalAgent.keepAliveMsecs = 60 * 10000;
https.globalAgent.maxSockets = 10;

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
      .where(['token_id=? AND token_holder_contract_address IS NOT NULL', tokenId])
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

      console.log('in iteration', maxIteration);
      for (let i = 0; i < receiverTokenHolders.length; i++) {
        let transferTos = receiverTokenHolders.slice(i, i + NO_OF_TRANSFERS_IN_EACH_TRANSACTION),
          transferAmounts = [],
          ostObj = connectionObjects[i % connectionObjects.length],
          transactionsService = ostObj.services.transactions;

        if (transferTos.length <= 0) continue;

        for (let j = 0; j < transferTos.length; j++) {
          transferAmounts.push('10000');
        }

        let raw_calldata = JSON.stringify({
          method: 'directTransfers',
          parameters: [transferTos, transferAmounts]
        });

        let metaType = 'company_to_user';

        if (i % 3 === 0) {
          metaType = 'company_to_user';
        } else if (i % 3 === 1) {
          metaType = 'user_to_user';
        } else {
          metaType = 'user_to_company';
        }

        let name = 'TestName' + (i % 50);

        let metaPropertyParams = {
          name: name,
          type: metaType,
          details: 'seize test data'
        };

        let executeParams = {
          user_id: COMPANY_UUID,
          to: TOKEN_RULE_ADDRESS,
          raw_calldata: raw_calldata,
          meta_property: metaPropertyParams,
          i: i + '-' + maxIteration
        };

        promiseArray.push(
          transactionsService.execute(executeParams).catch(function(err) {
            console.error('====Transaction failed from user:', executeParams);
          })
        );

        if (i % PARALLEL_TRANSACTIONS == 0 || i + 1 == receiverTokenHolders.length) {
          await Promise.all(promiseArray);
          promiseArray = [];
        }
        if (sigintReceived) break;
      }
      if (sigintReceived) break;
    }
  }
}

function handle() {
  logger.info('======= Sigint received =======');
  sigintReceived = 1;
}
process.on('SIGINT', handle);
process.on('SIGTERM', handle);

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
