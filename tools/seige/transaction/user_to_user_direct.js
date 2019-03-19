'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  RequestKlass = require(rootPrefix + '/tools/seige/personalKeySigner'),
  GetTokenDetails = require(rootPrefix + '/tools/seige/userFlow/GetTokenDetails'),
  SiegeUser = require(rootPrefix + '/app/models/mysql/SiegeUser');

const https = require('https'),
  OSTSDK = require('@ostdotcom/ost-sdk-js'),
  OpenstJs = require('@openst/openst.js'),
  Web3 = require('web3'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/nonce/contract/TokenHolder');

program
  .option('--apiKey <apiKey>', 'API KEY')
  .option('--apiSecret <apiSecret>', 'API Secret')
  .option('--tokenRulesAddress <tokenRulesAddress>', 'tokenRulesAddress')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node tools/seige/transaction/user_to_user_direct.js --apiKey <> --apiSecret <> --tokenRulesAddress <> '
  );
  logger.log('');
  logger.log('');
});

const API_KEY = program.apiKey,
  API_SECRET = program.apiSecret,
  TOKEN_RULE_ADDRESS = program.tokenRulesAddress,
  API_END_POINT = 'https://s6-api.stagingost.com/mainnet/v2',
  MAX_NO_OF_SENDERS = 2, // regardless of this number, it can not exceed half of users generated.
  PARALLEL_TRANSACTIONS = 2, // regardless of this number, it can not exceed MAX_NO_OF_SENDERS
  NO_OF_TRANSFERS_IN_EACH_TRANSACTION = 1;

let maxIteration = 10;

https.globalAgent.keepAlive = true;
https.globalAgent.keepAliveMsecs = 60 * 10000;
https.globalAgent.maxSockets = 100;

class TransactionSiege {
  constructor() {
    const oThis = this;

    oThis.tokenId = null;
    oThis.auxChainId = null;
    oThis.siegeData = {};
    oThis.sessionNonceMap = {};
    oThis.receiverTokenHolders = [];
    oThis.senderUuids = [];
    oThis.sessionAddressMap = {};
  }

  async perform() {
    const oThis = this;

    await oThis._getTokenData();

    await oThis._init();

    await oThis._getSessionKeyNonce();

    await oThis.runExecuteTransaction();
  }

  async _init() {
    const oThis = this;

    let siegeUser = new SiegeUser();

    let Rows = await siegeUser
      .select('*')
      .where({ token_id: oThis.tokenId })
      .where(['token_holder_contract_address IS NOT NULL'])
      .limit(MAX_NO_OF_SENDERS * 2)
      .fire();
    let addIndex = basicHelper.shuffleArray([0, 1])[0];

    for (let i = 0; i < Rows.length; i++) {
      oThis.siegeData[Rows[i].user_uuid] = Rows[i];

      if ((i + addIndex) % 2) {
        oThis.receiverTokenHolders.push(Rows[i].token_holder_contract_address);
      } else {
        oThis.senderUuids.push(Rows[i].user_uuid);
      }
    }
  }

  async _getTokenData() {
    const oThis = this;

    let ostObj = new OSTSDK({
        apiKey: API_KEY,
        apiSecret: API_SECRET,
        apiEndpoint: API_END_POINT,
        config: { timeout: 100 }
      }),
      getTokenDetailsObj = new GetTokenDetails({ ostObj: ostObj }),
      tokenDetails = await getTokenDetailsObj.perform();

    oThis.tokenId = tokenDetails.data.token.id;
    oThis.auxChainId = tokenDetails.data.token.auxiliary_chains[0].chain_id;
  }

  async _getSessionKeyNonce() {
    const oThis = this;

    let configStrategyHelper = new ConfigStrategyHelper(oThis.auxChainId, 0),
      configRsp = await configStrategyHelper.getComplete(),
      config = configRsp.data,
      ic = new InstanceComposer(config);

    let promiseArray = [];

    oThis.wsProviders = config.auxGeth.readOnly.wsProviders;

    for (let i = 0; i < oThis.senderUuids.length; i++) {
      let params = {
          auxChainId: oThis.auxChainId,
          tokenId: oThis.tokenId,
          userId: oThis.senderUuids[i],
          sessionAddress: oThis.siegeData[oThis.senderUuids[i]].session_address,
          web3Providers: config.auxGeth.readOnly.wsProviders,
          chainWsProviders: config.auxGeth.readOnly.wsProviders
        },
        TokenHolderContractNonce = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenHolderNonce');

      promiseArray.push(
        new TokenHolderContractNonce(params).perform().then(function(resp) {
          oThis.sessionNonceMap[oThis.senderUuids[i]] = parseInt(resp.data.nonce);
        })
      );
    }

    await Promise.all(promiseArray);
  }

  async runExecuteTransaction() {
    const oThis = this;

    while (maxIteration--) {
      let promiseArray = [];

      for (let i = 0; i < oThis.senderUuids.length; i++) {
        let senderUuid = oThis.senderUuids[i],
          senderDetails = oThis.siegeData[senderUuid],
          sessionAddress = senderDetails.session_address,
          transferTos = oThis.receiverTokenHolders.slice(i, i + NO_OF_TRANSFERS_IN_EACH_TRANSACTION);

        let params = {
          transferTos: transferTos,
          senderUuid: senderUuid
        };

        let vrs = await oThis._signEIP1077Transaction(params);

        let requestObj = new RequestKlass({
            tokenId: oThis.tokenId,
            walletAddress: senderDetails.device_address,
            apiSignerAddress: senderDetails.device_address,
            apiSignerPrivateKey: senderDetails.device_pk,
            apiEndpoint: API_END_POINT,
            userUuid: senderUuid
          }),
          queryParams = {
            to: TOKEN_RULE_ADDRESS,
            raw_calldata: oThis.raw_calldata,
            calldata: oThis.calldata,
            signature: vrs.signature,
            signer: sessionAddress,
            nonce: oThis.sessionNonceMap[senderUuid],
            i: i + '-' + maxIteration
          },
          resource = `/users/${senderUuid}/transactions`;

        promiseArray.push(
          requestObj
            .post(resource, queryParams)
            .then(function(response) {
              oThis.sessionNonceMap[senderUuid] = oThis.sessionNonceMap[senderUuid] + 1;
            })
            .catch(function(err) {
              console.log(JSON.stringify(err));
            })
        );

        if (i % PARALLEL_TRANSACTIONS == 0 || i + 1 == oThis.senderUuids.length) {
          await Promise.all(promiseArray);
          promiseArray = [];
        }
      }
    }
  }

  _signEIP1077Transaction(params) {
    const oThis = this;

    let TokenHolder = OpenstJs.Helpers.TokenHolder,
      TokenRules = OpenstJs.Helpers.TokenRules,
      web3 = new Web3(oThis.wsProviders[0]), //TODO: use random of providers.
      senderUuid = params.senderUuid,
      senderDetails = oThis.siegeData[senderUuid],
      tokenRulesAddress = web3.utils.toChecksumAddress(TOKEN_RULE_ADDRESS),
      tokenHolderSender = web3.utils.toChecksumAddress(senderDetails.token_holder_contract_address),
      transferTos = params.transferTos,
      transferAmounts = [],
      ephemeralKeyObj = web3.eth.accounts.wallet.add(senderDetails.session_pk),
      tokenRulesObject = new TokenRules(tokenRulesAddress, web3),
      tokenHolder = new TokenHolder(web3, tokenHolderSender);

    for (let j = 0; j < transferTos.length; j++) {
      transferAmounts.push('1');
    }
    oThis.calldata = tokenRulesObject.getDirectTransferExecutableData(transferTos, transferAmounts);

    oThis.raw_calldata = JSON.stringify({
      method: 'directTransfers',
      parameters: [transferTos, transferAmounts]
    });

    let transaction = {
      from: tokenHolderSender,
      to: tokenRulesAddress,
      data: oThis.calldata,
      nonce: oThis.sessionNonceMap[senderUuid],
      callPrefix: tokenHolder.getTokenHolderExecuteRuleCallPrefix(),
      value: '0x0',
      gasPrice: 0,
      gas: '0'
    };

    return ephemeralKeyObj.signEIP1077Transaction(transaction);
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
