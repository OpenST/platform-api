'use strict';
/*
 * This module helps in Executing Token Holder Redemption transaction for company.
 *
 * @module lib/redeemAndUnstake/brandToken/ExecuteTokenHolderRedemption
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'),
  NonceGetForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');
class ExecuteTokenHolderRedemption extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;
    oThis.facilitator = params.facilitator;

    oThis.redeemerNonce = null;
    oThis.hashLockResponse = null;
    oThis.coGatewayContractAddress = null;
    oThis.sessionKeyAddress = null;
    oThis.sessionKeyNonce = null;
    oThis.signatureData = null;
  }

  /**
   * Set Aux web3 instance
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    await oThis._setAuxWeb3Instance();
  }

  /**
   * Fetch contract addresses involved in transaction
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchTokenContracts();
  }

  /**
   * Fetch token co gateway contract address.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchTokenContracts() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.coGatewayContractAddress = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }

  /**
   * Get session details of a user from session details cache
   *
   * @returns {Promise<*|result>}
   */
  async _getUserSessionsDataFromCache(ic, sessionKeyAddresses) {
    const oThis = this;

    let SessionsByAddressCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        addresses: sessionKeyAddresses
      }),
      sessionsByAddressCacheRsp = await sessionsByAddressCache.fetch();

    if (sessionsByAddressCacheRsp.isFailure()) {
      return Promise.reject('Could not find session data');
    }

    return sessionsByAddressCacheRsp;
  }

  /**
   * Set session address
   *
   * @private
   */
  async _setSessionAddress() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]),
      ic = new InstanceComposer(response[oThis.auxChainId]);

    // fetch session key addresses for given user id
    let UserSessionAddressCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
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
      return Promise.reject('Session address not found');
    }

    const sessionKeyAddresses = userSessionAddressCacheResp.data['addresses'];

    // fetch session addresses details
    let getUserSessionsCacheResponse = await oThis._getUserSessionsDataFromCache(ic, sessionKeyAddresses);

    if (getUserSessionsCacheResponse.isFailure() || !getUserSessionsCacheResponse.data) {
      return Promise.reject(getUserSessionsCacheResponse);
    }

    let sessionAddressToDetailsMap = getUserSessionsCacheResponse.data,
      allowedSessionKeys = [],
      sessionData = {};

    // select session keys such that its spending limit is greater than pessimisticDebitAmount
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
      return Promise.reject('Spending limit of session is less than Redeem amount');
    }

    oThis.sessionKeyAddress = allowedSessionKeys[0];

    let nonceGetForSessionResp = await new NonceGetForSession({
      address: oThis.sessionKeyAddress,
      chainId: oThis.auxChainId,
      userId: oThis.userId,
      tokenId: oThis.tokenId,
      configStrategy: ic.configStrategy
    }).getNonce();

    if (nonceGetForSessionResp.isFailure()) {
      return Promise.reject(nonceGetForSessionResp);
    }

    oThis.sessionKeyNonce = nonceGetForSessionResp.data.nonce;
  }

  /**
   * Get executable tx data
   * @private
   */
  async _getExecutableTxData() {
    const oThis = this;

    await oThis._setSessionAddress();

    console.log('sessionAddress', oThis.sessionKeyAddress);
    console.log('sessionNonce', oThis.sessionKeyNonce);

    oThis.redeemerNonce = await ContractInteractLayer.getRedeemerNonce(
      oThis.auxWeb3,
      oThis.coGatewayContractAddress,
      oThis.redeemerAddress
    );

    oThis.hashLockResponse = oThis.getSecretHashLock();

    console.log('transactionExecutableDataInput: ', [
      oThis.amountToRedeem,
      oThis.beneficiary,
      '0',
      '0',
      oThis.redeemerNonce,
      oThis.hashLockResponse.hashLock
    ]);

    const transactionExecutableData = ContractInteractLayer.getCoGatewayRedeemExecutableData(
      oThis.auxWeb3,
      oThis.amountToRedeem,
      oThis.beneficiary,
      '0',
      '0',
      oThis.redeemerNonce,
      oThis.hashLockResponse.hashLock
    );

    console.log('transactionExecutableData', transactionExecutableData);

    const callPrefix = ContractInteractLayer.getTokenHolderExecuteRedemptionCallPrefix(oThis.auxWeb3);

    console.log('callPrefix', callPrefix);

    // TODO: CallPrefix is hardcoded for now.
    const signData = {
      from: oThis.auxWeb3.utils.toChecksumAddress(oThis.redeemerAddress), // TH proxy address
      to: oThis.auxWeb3.utils.toChecksumAddress(oThis.coGatewayContractAddress), // Co-Gateway contract address
      data: transactionExecutableData,
      nonce: oThis.sessionKeyNonce,
      callPrefix: '0x221e1782'
    };

    console.log('signData', signData);

    await oThis._getSessionKeySignature(signData);

    console.log('signatureData', oThis.signatureData);

    console.log('executeRedemptionRawTxInput', [
      oThis.redeemerAddress,
      oThis.coGatewayContractAddress,
      transactionExecutableData,
      oThis.sessionKeyNonce,
      oThis.signatureData.r,
      oThis.signatureData.s,
      oThis.signatureData.v
    ]);

    return ContractInteractLayer.executeRedemptionRawTx(
      oThis.auxWeb3,
      oThis.redeemerAddress,
      oThis.coGatewayContractAddress,
      transactionExecutableData,
      oThis.sessionKeyNonce,
      oThis.signatureData.r,
      oThis.signatureData.s,
      oThis.signatureData.v
    );
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
  async _getSessionKeySignature(executableTxData) {
    const oThis = this;

    console.log('========signEIP1077Transaction===transactionObject==========', executableTxData);

    // fetch Private Key of session address
    let sessionKeyAddrPK = await oThis._fetchPrivateKey(oThis.sessionKeyAddress),
      sessionKeyObject = oThis.auxWeb3.eth.accounts.wallet.add(sessionKeyAddrPK);

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
   * Build transaction data to be submitted
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    let txData = await oThis._getExecutableTxData();

    console.log('txData', txData);

    oThis.transactionData = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.executeBTredemptionGas,
      value: '0x0',
      from: oThis.facilitator,
      to: oThis.redeemerAddress,
      data: txData
    };
  }

  /**
   * Get chain id on which transaction would be submitted
   *
   * @returns {*}
   * @private
   */
  _getChainId() {
    const oThis = this;

    return oThis.auxChainId;
  }

  /**
   * Extra data to be merged in response
   *
   * @returns {{}}
   * @private
   */
  _mergeExtraResponseData() {
    const oThis = this;

    return {
      secretString: oThis.hashLockResponse.secret,
      redeemerNonce: oThis.redeemerNonce
    };
  }
}

module.exports = ExecuteTokenHolderRedemption;
