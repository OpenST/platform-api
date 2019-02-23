'use strict';
/**
 * This service executes Company To User Transaction
 *
 * @module app/services/executeTransaction/FromCompany
 */

const BigNumber = require('bignumber.js'),
  OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  TokenHolderHelper = OpenStJs.Helpers.TokenHolder;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  NonceGetForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  ExecuteTxBase = require(rootPrefix + '/app/services/executeTransaction/Base'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');
require(rootPrefix + '/lib/cacheManagement/chain/UserTransactionCount');

/**
 * Class
 *
 * @class
 */
class ExecuteCompanyToUserTx extends ExecuteTxBase {
  /**
   * Constructor for company to user tx class
   *
   * @param {Object} params
   * @param {Object} params.client_id - client id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.clientId = params.client_id;
  }

  /**
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    // TODO - add necessary validations
  }

  /**
   *  Set sender token holder address
   *
   * @private
   */
  async _setTokenHolderAddress() {
    const oThis = this;

    // fetch token's company users
    let tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data['userUuids']
    ) {
      return Promise.reject(tokenCompanyUserCacheRsp);
    }

    let tokenCompanyUsers = tokenCompanyUserCacheRsp.data['userUuids'];

    // fetch company users details
    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: tokenCompanyUsers
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCacheObj.fetch();

    if (tokenUserDetailsCacheRsp.isFailure() || !tokenUserDetailsCacheRsp.data) {
      return Promise.reject(tokenUserDetailsCacheRsp);
    }

    let usersData = tokenUserDetailsCacheRsp.data,
      companyTokenHolderAddresses = [],
      sessionShards = [];

    for (let uuid in usersData) {
      let userData = usersData[uuid];

      // select company users with saas api status = active
      if (userData.saasApiStatus == tokenUserConstants.saasApiActiveStatus) {
        companyTokenHolderAddresses.push(userData.tokenHolderAddress);
        sessionShards.push(userData.sessionShardNumber);
      }
    }

    if (companyTokenHolderAddresses.length === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_fc_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: oThis.clientId
          }
        })
      );
    }

    // currently, we have only one company token holder
    oThis.userId = tokenCompanyUsers[0]; //token Company UserUuid
    oThis.tokenHolderAddress = companyTokenHolderAddresses[0];
    oThis.sessionShardNumber = sessionShards[0];
  }

  /**
   * Set session address
   *
   * @private
   */
  async _setSessionAddress() {
    const oThis = this;

    // fetch session key addresses for given user id
    let UserSessionAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCache = new UserSessionAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        shardNumber: oThis.sessionShardNumber
      }),
      userSessionAddressCacheResp = await userSessionAddressCache.fetch();

    if (userSessionAddressCacheResp.isFailure() || !userSessionAddressCacheResp.data) {
      return Promise.reject(userSessionAddressCacheResp);
    }

    if (userSessionAddressCacheResp.data['addresses'].length === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_fc_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            userId: oThis.userId,
            tokenId: oThis.tokenId
          }
        })
      );
    }

    oThis.sessionKeyAddresses = userSessionAddressCacheResp.data['addresses'];

    // fetch session addresses details
    let getUserSessionsCacheResponse = await oThis._getUserSessionsDataFromCache();

    if (getUserSessionsCacheResponse.isFailure() || !getUserSessionsCacheResponse.data) {
      return Promise.reject(getUserSessionsCacheResponse);
    }

    let sessionAddressToDetailsMap = getUserSessionsCacheResponse.data,
      allowedSessionKeys = [];

    // select session keys such that its spending limit is greater than pessimisticDebitAmount
    for (let i = 0; i < oThis.sessionKeyAddresses.length; i++) {
      let sessionData = sessionAddressToDetailsMap[oThis.sessionKeyAddresses[i]];
      if (
        sessionData.status === sessionConstants.authorizedStatus &&
        oThis.pessimisticDebitAmount.lte(new BigNumber(sessionData.spendingLimit))
      ) {
        allowedSessionKeys.push(oThis.sessionKeyAddresses[i]);
      }
    }

    if (allowedSessionKeys.length === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_fc_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            sessionKeyAddresses: oThis.sessionKeyAddresses
          }
        })
      );
    }

    // then, sequentially select one session key using index from cache
    oThis.sessionKeyAddress = await oThis._selectSessionKey(allowedSessionKeys);
    logger.debug('sessionKeyAddress-----', oThis.sessionKeyAddress);
  }

  /**
   * Function to set session key nonce value.
   *
   * @private
   */
  async _setNonce() {
    const oThis = this;

    // get nonce from session nonce manager
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

  /**
   * set signature
   *
   * @return {Promise<void>}
   * @private
   */
  async _setSignature() {
    const oThis = this;

    const tokenHolderHelper = new TokenHolderHelper(oThis.web3Instance, oThis.tokenHolderAddress);

    const transactionObject = {
      // TODO - move the toChecksumAddress sanitizing inside interaction layers
      from: oThis.web3Instance.utils.toChecksumAddress(oThis.tokenHolderAddress), // TH proxy address
      to: oThis.web3Instance.utils.toChecksumAddress(oThis.tokenRuleAddress), // TR contract address
      data: oThis.transferExecutableData,
      nonce: oThis.sessionKeyNonce,
      callPrefix: tokenHolderHelper.getTokenHolderExecuteRuleCallPrefix()
    };

    logger.debug('========signEIP1077Transaction===transactionObject==========', transactionObject);

    // fetch Private Key of session address
    let sessionKeyAddrPK = await oThis._fetchPrivateKey(oThis.sessionKeyAddress),
      sessionKeyObject = oThis.web3Instance.eth.accounts.wallet.add(sessionKeyAddrPK);

    // sign EIP1077 tx
    // TODO - ethereum js tx support for EIP1077
    const vrs = sessionKeyObject.signEIP1077Transaction(transactionObject);

    oThis.signatureData = {
      r: vrs.r,
      s: vrs.s,
      v: vrs.v,
      messageHash: vrs.messageHash,
      signature: vrs.signature
    };
  }

  /**
   *
   * @private
   */
  _verifySessionSpendingLimit() {
    // do nothing as session spending limit is checked in _setSessionAddress function
  }

  /**
   * Get session details of a user from session details cache
   *
   * @returns {Promise<*|result>}
   */
  async _getUserSessionsDataFromCache() {
    const oThis = this;

    let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        addresses: oThis.sessionKeyAddresses,
        shardNumber: oThis.sessionShardNumber
      }),
      sessionsByAddressCacheRsp = await sessionsByAddressCache.fetch();

    if (sessionsByAddressCacheRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_s_l_bui_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return sessionsByAddressCacheRsp;
  }

  /**
   * Select one key given array using index returned from cache
   *
   * @param sessionKeys
   * @return {Promise<void>}
   * @private
   */
  async _selectSessionKey(sessionKeys) {
    const oThis = this;

    let indexFromCache = 0,
      UserTransactionCount = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserTransactionCount'),
      userTransactionCount = new UserTransactionCount({
        tokenId: oThis.tokenId
      }),
      userTransactionCountTxCacheRsp = await userTransactionCount.fetch();

    if (userTransactionCountTxCacheRsp.isSuccess() && userTransactionCountTxCacheRsp.data) {
      indexFromCache = userTransactionCountTxCacheRsp.data;
    }

    let indexToSelect = indexFromCache % sessionKeys.length;

    logger.debug('indexToSelect------', indexToSelect);

    return basicHelper.sanitizeAddress(sessionKeys[indexToSelect]);
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
}

InstanceComposer.registerAsShadowableClass(ExecuteCompanyToUserTx, coreConstants.icNameSpace, 'ExecuteCompanyToUserTx');

module.exports = {};
