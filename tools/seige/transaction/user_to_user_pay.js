'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  SiegeUser = require(rootPrefix + '/app/models/mysql/SiegeUser');

const https = require('https'),
  OSTSDK = require('@ostdotcom/ost-sdk-js'),
  OpenstJs = require('@openst/openst.js'),
  Web3 = require('web3'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

// TODO: Change these constants when you run
const API_KEY = '',
  API_SECRET = '',
  API_END_POINT = '',
  CHAIN_ID = 2000,
  TOKEN_ID = 12345,
  PRICER_RULE_ADDRESS = '',
  PARALLEL_TRANSACTIONS = 2,
  PER_SDK_LIMIT = 30,
  USER_SHARD_NUMBER = 1,
  OST_TO_USD_IN_WEI = '23757000000000000', // Get this value from currency_conversion_rates table
  RECEIVER_COUNT = 500;

https.globalAgent.keepAlive = true;
https.globalAgent.keepAliveMsecs = 60 * 10000;
https.globalAgent.maxSockets = 100;

let sdkLimit = 10,
  senders = [],
  receiverTokenHolders = [],
  sessionAddressMap = {},
  tokenShardDetails = {
    user: USER_SHARD_NUMBER
  };

class TransactionSiege {
  constructor() {
    const oThis = this;

    oThis.userDataMap = {};
    oThis.sessionNonceMap = {};
  }

  async perform() {
    const oThis = this;

    await oThis._init();

    await oThis._getUserData();

    await oThis._getSessionKeyNonce();

    let count = 0;

    oThis.promiseArray = [];

    while (sdkLimit--) {
      let perSdkLimit = PER_SDK_LIMIT,
        ostObj = new OSTSDK({
          apiKey: API_KEY,
          apiSecret: API_SECRET,
          apiEndpoint: API_END_POINT,
          config: { timeout: 100 }
        }),
        transactionsService = ostObj.services.transactions;

      while (perSdkLimit > 0) {
        for (let i = 0; i < senders.length; i++) {
          if (count % PARALLEL_TRANSACTIONS == 0 || perSdkLimit == 0) {
            await Promise.all(oThis.promiseArray);
            oThis.promiseArray = [];
          }

          let senderId = senders[i],
            receiverTokenHolder = receiverTokenHolders[i],
            sessionAddress = sessionAddressMap[senderId];

          let params = {
            receiver: receiverTokenHolder,
            index: i,
            nonce: oThis.sessionNonceMap[sessionAddress],
            senderTokenHolder: oThis.userDataMap[senderId].tokenHolderAddress,
            sessionPrivateKey: oThis.siegeData[senderId].session_pk
          };

          let vrs = await oThis._signEIP1077Transaction(params);

          let executeParams = {
            user_data: oThis.userDataMap[senderId],
            token_shard_details: tokenShardDetails,
            to: PRICER_RULE_ADDRESS,
            raw_calldata: oThis.raw_calldata,
            signature: vrs.signature,
            signer: sessionAddress,
            nonce: oThis.sessionNonceMap[sessionAddress]
          };

          oThis.promiseArray.push(
            transactionsService
              .execute(executeParams)
              .then(function(resp) {
                oThis.sessionNonceMap[senderId] = oThis.sessionNonceMap[senderId] + 1;
              })
              .catch(function(err) {
                console.error('====Transaction failed from user:', senderId);
              })
          );

          count++;
          perSdkLimit--;
        }

        if (count % PARALLEL_TRANSACTIONS == 0 || perSdkLimit == 0) {
          await Promise.all(oThis.promiseArray);
          oThis.promiseArray = [];
        }
      }
    }
  }

  async _init() {
    const oThis = this;

    let siegeUser = new SiegeUser();

    let Rows = await siegeUser.select('*').fire();

    oThis.siegeData = {};
    for (let i = 0; i < Rows.length; i++) {
      oThis.siegeData[Rows[i].user_uuid] = Rows[i];

      if (count > RECEIVER_COUNT) {
        receiverTokenHolders.push(Rows[i].token_holder_contract_address);
      } else {
        senders.push(Rows[i].user_uuid);
      }
    }
  }

  async _getUserData() {
    const oThis = this;

    let ostObj = new OSTSDK({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      apiEndpoint: API_END_POINT,
      config: { timeout: 100 }
    });

    let userService = ostObj.services.users;

    for (let i = 0; i < senders.length; ) {
      let ids = senders.slice(i, i + 10);

      let response = await userService.getList({
        ids: ids,
        limit: 10
      });

      if (response.isFailure()) {
        return Promise.reject(response);
      }

      Object.assign(oThis.userDataMap, response.data);
    }
  }

  async _getSessionKeyNonce() {
    const oThis = this;

    let configStrategyHelper = new ConfigStrategyHelper(CHAIN_ID, 0),
      configRsp = await configStrategyHelper.getComplete(),
      config = configRsp.data,
      ic = new InstanceComposer(config);

    let promiseArray = [];

    oThis.wsProvider = config.auxGeth.readOnly.wsProviders[0];

    for (let i = 0; i < senders.length; i++) {
      let params = {
          auxChainId: CHAIN_ID,
          tokenId: TOKEN_ID,
          userId: senders[i],
          sessionAddress: oThis.siegeData[senders[i]].session_address,
          web3Providers: config.auxGeth.readOnly.wsProviders
        },
        TokenHolderContractNonce = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenHolderNonce');

      promiseArray.push(
        new TokenHolderContractNonce(params).perform().then(function(resp) {
          oThis.sessionNonceMap[senders[i]] = resp.data.nonce;
        })
      );
    }

    await Promise.all(promiseArray);
  }

  _signEIP1077Transaction(params) {
    const oThis = this;

    let TokenHolder = OpenstJs.Helpers.TokenHolder,
      PricerRule = OpenstJs.Helpers.Rules.PricerRule,
      web3 = new Web3(oThis.wsProvider),
      pricerRuleAddress = web3.utils.toChecksumAddress(PRICER_RULE_ADDRESS),
      tokenHolderSender = web3.utils.toChecksumAddress(params.senderTokenHolder),
      transferTos = receiverTokenHolders.slice(params.index, params.index + 3),
      transferAmounts = ['1', '1', '1'],
      ephemeralKeyObj = web3.eth.accounts.wallet.add(params.sessionPrivateKey),
      pricerRule = new PricerRule(web3, pricerRuleAddress),
      tokenHolder = new TokenHolder(web3, tokenHolderSender),
      payCurrencyCode = 'USD',
      ostToUsdInWei = OST_TO_USD_IN_WEI,
      directTransferExecutable = pricerRule.getDirectTransferExecutableData(transferTos, transferAmounts);

    oThis.raw_calldata = JSON.stringify({
      method: 'pay',
      parameters: [tokenHolderSender, transferTos, transferAmounts, payCurrencyCode, ostToUsdInWei]
    });

    let transaction = {
      from: tokenHolderSender,
      to: pricerRuleAddress,
      data: directTransferExecutable,
      nonce: params.nonce,
      callPrefix: tokenHolder.getTokenHolderExecuteRuleCallPrefix(),
      value: 0,
      gasPrice: 0,
      gas: 0
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
