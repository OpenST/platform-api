'use strict';
/**
 * This service executes Company To User Transaction
 *
 * @module app/services/transaction/execute/FromCompany
 */

const BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  NonceGetForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  ExecuteTxBase = require(rootPrefix + '/app/services/transaction/execute/Base'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/CompanySessionTransactionCount');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

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
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.tokenShardDetails = null;
  }

  /**
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    oThis.rawCalldata = await basicHelper.sanitizeRawCallData(oThis.rawCalldata);

    if (!CommonValidators.validateRawCallData(oThis.rawCalldata)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_et_fc_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata'],
          debug_options: {}
        })
      );
    }
  }

  /**
   *
   * set token shard details
   *
   * @private
   */
  async _setTokenShardDetails() {
    const oThis = this;

    let TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
    let tokenShardNumbersCache = new TokenShardNumbersCache({
      tokenId: oThis.tokenId
    });

    let response = await tokenShardNumbersCache.fetch();
    if (response.isFailure()) {
      return Promise.reject(response);
    }
    oThis.tokenShardDetails = response.data;
  }

  /**
   *
   * set user data for oThis.userId
   *
   * @private
   */
  async _setCurrentUserData() {
    const oThis = this;

    // fetch company users details
    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId],
        shardNumber: oThis.tokenShardDetails[shardConstant.userEntityKind]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCacheObj.fetch();

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('Could not fetched token user details.');
      Promise.reject(tokenUserDetailsCacheRsp);
    }

    oThis.userData = tokenUserDetailsCacheRsp.data[oThis.userId];
    if (!CommonValidators.validateObject(oThis.userData)) {
      return oThis._validationError('a_s_et_fc_2', ['invalid_user_id'], {
        userId: oThis.userId
      });
    }
  }

  /**
   *  Set sender token holder address
   *
   * @private
   */
  async _setTokenHolderAddress() {
    const oThis = this;

    if (oThis.userData.kind !== tokenUserConstants.companyKind) {
      return oThis._validationError('a_s_et_fc_3', ['invalid_user_id'], {
        userKind: oThis.userData.kind
      });
    }

    if (oThis.userData.saasApiStatus !== tokenUserConstants.saasApiActiveStatus) {
      return oThis._validationError('a_s_et_fc_4', ['saas_inactive_user_id'], {
        saasApiStatus: oThis.userData.saasApiStatus
      });
    }

    if (oThis.userData.status !== tokenUserConstants.activatedStatus) {
      return oThis._validationError('a_s_et_fc_5', ['inactive_user_id'], {
        status: oThis.userData.status
      });
    }

    oThis.tokenHolderAddress = oThis.userData.tokenHolderAddress;
    oThis.sessionShardNumber = oThis.userData.sessionShardNumber;
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
        shardNumber: oThis.sessionShardNumber,
        page: 1,
        limit: 300
      }),
      userSessionAddressCacheResp = await userSessionAddressCache.fetch();

    if (userSessionAddressCacheResp.isFailure() || !userSessionAddressCacheResp.data) {
      return Promise.reject(userSessionAddressCacheResp);
    }

    if (userSessionAddressCacheResp.data['addresses'].length === 0) {
      return oThis._validationError('a_s_et_fc_6', ['session_not_found'], {
        userId: oThis.userId
      });
    }

    oThis.sessionKeyAddresses = userSessionAddressCacheResp.data['addresses'];

    // fetch session addresses details
    let getUserSessionsCacheResponse = await oThis._getUserSessionsDataFromCache();

    if (getUserSessionsCacheResponse.isFailure() || !getUserSessionsCacheResponse.data) {
      return Promise.reject(getUserSessionsCacheResponse);
    }

    let sessionAddressToDetailsMap = getUserSessionsCacheResponse.data,
      allowedSessionKeys = [],
      sessionData = {};

    // select session keys such that its spending limit is greater than pessimisticDebitAmount
    for (let i = 0; i < oThis.sessionKeyAddresses.length; i++) {
      sessionData = sessionAddressToDetailsMap[oThis.sessionKeyAddresses[i]];
      if (
        sessionData.status === sessionConstants.authorizedStatus &&
        oThis.pessimisticDebitAmount.lte(new BigNumber(sessionData.spendingLimit))
      ) {
        allowedSessionKeys.push(oThis.sessionKeyAddresses[i]);
      }
    }

    if (allowedSessionKeys.length === 0) {
      return oThis._validationError('a_s_et_fc_7', ['session_key_spending_limit_breached'], {
        spendingLimit: basicHelper.formatWeiToString(sessionData.spendingLimit),
        pessimisticDebitAmount: basicHelper.formatWeiToString(oThis.pessimisticDebitAmount)
      });
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

    logger.debug('========signEIP1077Transaction===transactionObject==========', oThis.executableTxData);

    // fetch Private Key of session address
    let sessionKeyAddrPK = await oThis._fetchPrivateKey(oThis.sessionKeyAddress),
      sessionKeyObject = oThis.web3Instance.eth.accounts.wallet.add(sessionKeyAddrPK);

    // sign EIP1077 tx
    // TODO - ethereum js tx support for EIP1077
    const vrs = sessionKeyObject.signEIP1077Transaction(oThis.executableTxData);

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
      return oThis._validationError('a_s_et_fc_8', ['invalid_session_addresses'], {
        userId: oThis.userId
      });
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
      CompanySessionTransactionCount = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'CompanySessionTransactionCount'),
      companySessionTransactionCount = new CompanySessionTransactionCount({
        tokenId: oThis.tokenId
      }),
      csTrxCountCacheRsp = await companySessionTransactionCount.fetch();

    if (csTrxCountCacheRsp.isSuccess() && csTrxCountCacheRsp.data) {
      indexFromCache = csTrxCountCacheRsp.data;
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

  /**
   * Custom validations over executable data
   *
   * @returns {Promise<void>}
   * @private
   */
  async _customValidationsOnExecutableData() {
    // do nothing as all validations are already done.
  }

  /**
   * Create User Redemption request, if transaction is for redemption
   *
   * @returns {Promise<void>}
   * @private
   */
  async _createUserRedemptionRequest() {
    // do nothing as redemption can only be done for user transactions.
  }
}

InstanceComposer.registerAsShadowableClass(ExecuteCompanyToUserTx, coreConstants.icNameSpace, 'ExecuteCompanyToUserTx');

module.exports = {};
