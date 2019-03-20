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
  MAX_NO_OF_SENDERS = 500, // regardless of this number, it can not exceed half of users generated.
  PARALLEL_TRANSACTION = 50,
  NO_OF_TRANSFERS_IN_EACH_TRANSACTION = 3;

let maxIteration = 20,
  sigintReceived = 0; // maxIteration * (MAX_NO_OF_SENDERS / PARALLEL_TRANSACTION)

https.globalAgent.keepAlive = true;
https.globalAgent.keepAliveMsecs = 60 * 10000;
https.globalAgent.maxSockets = 10;

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

    //await oThis.generateSignatures();

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
      oThis.siegeData[Rows[i].user_uuid].signatures = [];
      oThis.siegeData[Rows[i].user_uuid].requestObj = null;
      oThis.siegeData[Rows[i].user_uuid].requestDetails = [];

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

  async generateSignatures() {
    const oThis = this;

    let timeNow = Date.now(),
      iterationCount = 0;

    console.log('--------starting Signatures Generation at ', timeNow);

    while (iterationCount++ < maxIteration) {
      for (let i = 0; i < oThis.senderUuids.length; i++) {
        let senderUuid = oThis.senderUuids[i],
          transferTos = oThis.receiverTokenHolders.slice(i, i + NO_OF_TRANSFERS_IN_EACH_TRANSACTION),
          sessionNonce = oThis.sessionNonceMap[senderUuid];

        let params = {
          transferTos: transferTos,
          senderUuid: senderUuid,
          sessionNonce: sessionNonce
        };

        let eipTimeNow = Date.now();

        let signatureDetails = oThis._signEIP1077Transaction(params);

        oThis.generateRequestDetails({
          senderUuid: senderUuid,
          signature: signatureDetails.signature,
          calldata: signatureDetails.calldata,
          raw_calldata: signatureDetails.raw_calldata,
          sessionNonce: sessionNonce,
          randNo: i + '-' + maxIteration
        });

        console.log('--------complete Signing in ms: ', Date.now() - eipTimeNow);
        oThis.sessionNonceMap[senderUuid] = oThis.sessionNonceMap[senderUuid] + 1;
      }
    }
    console.log('\n\n------------------------ Completion of Signatures Generation at ', Date.now() - timeNow);
  }

  async generateRequestDetails(params) {
    const oThis = this;
    let senderUuid = params.senderUuid,
      senderDetails = oThis.siegeData[senderUuid];

    if (!senderDetails.requestObj) {
      senderDetails.requestObj = new RequestKlass({
        tokenId: oThis.tokenId,
        walletAddress: senderDetails.device_address,
        apiSignerAddress: senderDetails.device_address,
        apiSignerPrivateKey: senderDetails.device_pk,
        apiEndpoint: API_END_POINT,
        userUuid: senderUuid
      });
    }

    let queryParams = {
        to: TOKEN_RULE_ADDRESS,
        raw_calldata: params.raw_calldata,
        calldata: params.calldata,
        signature: params.signature,
        signer: senderDetails.session_address,
        nonce: params.sessionNonce,
        i: params.randNo
      },
      resource = `/users/${senderUuid}/transactions`;

    let requestData = senderDetails.requestObj._formatQueryParams(resource, queryParams);

    oThis.siegeData[senderUuid].requestDetails.push({
      resource: resource,
      queryParams: queryParams,
      requestData: requestData
    });
  }

  async runExecuteTransaction() {
    const oThis = this;

    let iterationCount = 0;
    let timeNow = Date.now(),
      reqBatchNumber = 0,
      promiseArray = [];
    console.log('\n\n\n ------------------------starting Transaction at ', timeNow);

    while (iterationCount++ < maxIteration) {
      for (let i = 0; i < oThis.senderUuids.length; i++) {
        let senderUuid = oThis.senderUuids[i],
          senderDetails = oThis.siegeData[senderUuid],
          transferTos = oThis.receiverTokenHolders.slice(i, i + NO_OF_TRANSFERS_IN_EACH_TRANSACTION),
          sessionNonce = oThis.sessionNonceMap[senderUuid];

        if (!senderDetails.requestObj) {
          senderDetails.requestObj = new RequestKlass({
            tokenId: oThis.tokenId,
            walletAddress: senderDetails.device_address,
            apiSignerAddress: senderDetails.device_address,
            apiSignerPrivateKey: senderDetails.device_pk,
            apiEndpoint: API_END_POINT,
            userUuid: senderUuid
          });
        }

        let signParams = {
          transferTos: transferTos,
          senderUuid: senderUuid,
          sessionNonce: sessionNonce
        };

        let signatureDetails = oThis._signEIP1077Transaction(signParams);

        let queryParams = {
            to: TOKEN_RULE_ADDRESS,
            raw_calldata: signatureDetails.raw_calldata,
            calldata: signatureDetails.calldata,
            signature: signatureDetails.signature,
            signer: senderDetails.session_address,
            nonce: sessionNonce,
            i: i + '-' + maxIteration
          },
          resource = `/users/${senderUuid}/transactions`;

        let requestObj = senderDetails.requestObj;

        let promise = requestObj
          .post(resource, queryParams)
          .then(function(response) {
            oThis.sessionNonceMap[senderUuid] = oThis.sessionNonceMap[senderUuid] + 1;
            console.log('transaction passed for uuid', senderUuid, JSON.stringify(response));
          })
          .catch(function(err) {
            console.log('transaction Failed for uuid', senderUuid, JSON.stringify(err));
          });

        promiseArray.push(promise);
        if (i % PARALLEL_TRANSACTION == 0 || i + 1 == oThis.senderUuids.length) {
          await Promise.all(promiseArray);
          console.log('Request batch number ', ++reqBatchNumber);
        }
        if (sigintReceived) break;
      }
      if (sigintReceived) break;
    }
    console.log('--------complete Transaction in ms: ', Date.now() - timeNow);
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
    let calldata = tokenRulesObject.getDirectTransferExecutableData(transferTos, transferAmounts);

    let raw_calldata = JSON.stringify({
      method: 'directTransfers',
      parameters: [transferTos, transferAmounts]
    });

    let transaction = {
      from: tokenHolderSender,
      to: tokenRulesAddress,
      data: calldata,
      nonce: params.sessionNonce,
      callPrefix: tokenHolder.getTokenHolderExecuteRuleCallPrefix(),
      value: '0x0',
      gasPrice: 0,
      gas: '0'
    };

    let vrs = ephemeralKeyObj.signEIP1077Transaction(transaction);
    return {
      signature: vrs.signature,
      calldata: calldata,
      raw_calldata: raw_calldata
    };
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
