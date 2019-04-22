'use strict';

const BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  NonceGetForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'),
  BtRedeemRouter = require(rootPrefix + '/lib/workflow/redeemAndUnstake/brandToken/Router'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

class TokenRedeemByCompany extends ServiceBase {
  /**
   * Constructor
   *
   * @param params
   * @param {Number} params.client_id - client_id
   * @param {Number} params.token_id - token_id
   * @param {String} params.amount_to_redeem
   * @param {String} params.beneficiary
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.amountToRedeem = params.amount_to_redeem;
    oThis.beneficiary = params.beneficiary;

    oThis.auxChainId = oThis.ic().configStrategy.auxGeth.chainId;
    oThis.originChainId = oThis.ic().configStrategy.originGeth.chainId;
    oThis.userId = null;
    oThis.redeemerAddress = null;
    oThis.sessionKeyAddress = null;
    oThis.sessionKeyNonce = null;
    oThis.coGatewayContractAddress = null;
    oThis.redeemerNonce = null;
    oThis.hashLockResponse = null;
    oThis.signatureData = null;
    oThis.transactionExecutableData = null;
  }

  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchCompanyTokenHolder();

    await oThis._fetchCompanySession();

    await oThis._createExecutableTransaction();

    const resp = await oThis._insertWorkflow();

    return responseHelper.successWithData({ workflow: resp });
  }

  /**
   * Fetch Company token holder and set as redeemer Address
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _fetchCompanyTokenHolder() {
    const oThis = this;

    let tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data['userUuids']
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_r_bc_1',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({
        tokenId: oThis.tokenId,
        userIds: tokenCompanyUserCacheRsp.data['userUuids']
      }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    let usersData = cacheFetchRsp.data;

    for (let uuid in usersData) {
      let userData = usersData[uuid];
      if (userData.tokenHolderAddress) {
        oThis.userId = uuid;
        oThis.redeemerAddress = userData.tokenHolderAddress;
        break;
      }
    }

    if (!oThis.redeemerAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_r_bc_2',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.coGatewayContractAddress = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }

  /**
   * Get session details of a user from session details cache
   *
   * @returns {Promise<*|result>}
   */
  async _getUserSessionsDataFromCache(sessionKeyAddresses) {
    const oThis = this;

    let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        addresses: sessionKeyAddresses
      }),
      sessionsByAddressCacheRsp = await sessionsByAddressCache.fetch();

    if (sessionsByAddressCacheRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_r_bc_4',
          api_error_identifier: 'invalid_session_addresses',
          debug_options: {}
        })
      );
    }

    return sessionsByAddressCacheRsp;
  }

  /**
   * Fetch session address of company to sign transaction
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _fetchCompanySession() {
    const oThis = this;

    // fetch session key addresses for given user id
    let UserSessionAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCache = new UserSessionAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        page: 1
      }),
      userSessionAddressCacheResp = await userSessionAddressCache.fetch();

    if (userSessionAddressCacheResp.isFailure() || !userSessionAddressCacheResp.data) {
      return Promise.reject(userSessionAddressCacheResp);
    }

    if (userSessionAddressCacheResp.data['addresses'].length === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_r_bc_5',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    const sessionKeyAddresses = userSessionAddressCacheResp.data['addresses'];

    // fetch session addresses details
    let getUserSessionsCacheResponse = await oThis._getUserSessionsDataFromCache(sessionKeyAddresses);

    if (getUserSessionsCacheResponse.isFailure() || !getUserSessionsCacheResponse.data) {
      return Promise.reject(getUserSessionsCacheResponse);
    }

    let sessionAddressToDetailsMap = getUserSessionsCacheResponse.data,
      allowedSessionKeys = [],
      sessionData = {};

    // select session keys such that its spending limit is greater than amount to redeem.
    for (let i = 0; i < sessionKeyAddresses.length; i++) {
      const sessionData = sessionAddressToDetailsMap[sessionKeyAddresses[i]],
        amount = new BigNumber(oThis.amountToRedeem);
      if (
        sessionData.status === sessionConstants.authorizedStatus &&
        amount.lte(new BigNumber(sessionData.spendingLimit))
      ) {
        allowedSessionKeys.push(sessionKeyAddresses[i]);
      }
    }

    if (allowedSessionKeys.length === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_r_bc_3',
          api_error_identifier: 'invalid_spending_limit',
          debug_options: {}
        })
      );
    }

    oThis.sessionKeyAddress = allowedSessionKeys[0];

    let nonceGetForSessionResp = await new NonceGetForSession({
      address: oThis.sessionKeyAddress,
      chainId: oThis.auxChainId,
      userId: oThis.userId,
      tokenId: oThis.tokenId,
      configStrategy: oThis.ic().configStrategy
    }).getNonce();

    if (nonceGetForSessionResp.isFailure()) {
      return Promise.reject(nonceGetForSessionResp);
    }

    oThis.sessionKeyNonce = nonceGetForSessionResp.data.nonce;
  }

  /***
   *
   * get private key from cache
   *
   * @param {String} address
   *
   * @return {String}
   */
  async _fetchPrivateKey(address) {
    const oThis = this,
      addressPrivateKeyCache = new AddressPrivateKeyCache({ address: address }),
      addressPrivateKeyCacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData();

    return addressPrivateKeyCacheFetchRsp.data['private_key_d'];
  }

  /**
   * Get session key signature
   *
   * @return {Promise<void>}
   * @private
   */
  async _getSessionKeySignature(auxWeb3, executableTxData) {
    const oThis = this;

    console.log('========signEIP1077Transaction===transactionObject==========', executableTxData);

    // fetch Private Key of session address
    let sessionKeyAddrPK = await oThis._fetchPrivateKey(oThis.sessionKeyAddress),
      sessionKeyObject = auxWeb3.eth.accounts.wallet.add(sessionKeyAddrPK);

    // sign EIP1077 tx
    const vrs = sessionKeyObject.signEIP1077Transaction(executableTxData);

    oThis.signatureData = {
      r: vrs.r,
      s: vrs.s,
      v: vrs.v,
      messageHash: vrs.messageHash,
      signature: vrs.signature
    };
  }

  /**
   * Get executable tx data
   * @private
   */
  async _createExecutableTransaction() {
    const oThis = this;

    const auxWsProviders = oThis.ic().configStrategy.auxGeth.readWrite.wsProviders,
      auxWeb3 = web3Provider.getInstance(auxWsProviders[0]).web3WsProvider;

    oThis.redeemerNonce = await ContractInteractLayer.getRedeemerNonce(
      auxWeb3,
      oThis.coGatewayContractAddress,
      oThis.redeemerAddress
    );

    oThis.hashLockResponse = util.getSecretHashLock();

    oThis.transactionExecutableData = ContractInteractLayer.getCoGatewayRedeemExecutableData(
      auxWeb3,
      oThis.amountToRedeem,
      oThis.beneficiary,
      '0',
      '0',
      oThis.redeemerNonce,
      oThis.hashLockResponse.hashLock
    );

    const callPrefix = ContractInteractLayer.getTokenHolderExecuteRedemptionCallPrefix(auxWeb3);

    const signData = {
      from: auxWeb3.utils.toChecksumAddress(oThis.redeemerAddress), // TH proxy address
      to: auxWeb3.utils.toChecksumAddress(oThis.coGatewayContractAddress), // Co-Gateway contract address
      data: oThis.transactionExecutableData,
      nonce: oThis.sessionKeyNonce,
      callPrefix: callPrefix
    };

    await oThis._getSessionKeySignature(auxWeb3, signData);
  }

  /**
   * Insert BT redeem workflow
   *
   * @returns {Promise<*>}
   * @private
   */
  _insertWorkflow() {
    const oThis = this;

    let requestParams = {
        redeemerAddress: oThis.redeemerAddress,
        amountToRedeem: oThis.amountToRedeem,
        tokenId: oThis.tokenId,
        transactionExecutableData: oThis.transactionExecutableData,
        multiSigNonce: oThis.sessionKeyNonce,
        signature: { r: oThis.signatureData.r, s: oThis.signatureData.s, v: oThis.signatureData.v },
        secretString: oThis.hashLockResponse.secret,
        redeemerNonce: oThis.redeemerNonce,
        sourceChainId: oThis.auxChainId,
        destinationChainId: oThis.originChainId,
        originChainId: oThis.originChainId,
        auxChainId: oThis.auxChainId,
        beneficiary: oThis.beneficiary
      },
      redeemParams = {
        stepKind: workflowStepConstants.btRedeemAndUnstakeInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstant.btRedeemAndUnstake,
        requestParams: requestParams
      };

    let btRedeemRouterObj = new BtRedeemRouter(redeemParams);

    return btRedeemRouterObj.perform();
  }
}

InstanceComposer.registerAsShadowableClass(TokenRedeemByCompany, coreConstants.icNameSpace, 'TokenRedeemByCompany');

module.exports = {};
