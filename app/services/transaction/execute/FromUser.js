'use strict';

/**
 * This service executes User Transaction
 *
 * @module app/services/transaction/execute/FromUser
 */

const BigNumber = require('bignumber.js'),
  web3Utils = require('web3-utils'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  signValidator = require(rootPrefix + '/lib/validators/Sign'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ExecuteTxBase = require(rootPrefix + '/app/services/transaction/execute/Base');

require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

/**
 * Class
 *
 * @class
 */
class ExecuteTxFromUser extends ExecuteTxBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.user_data - data of user who signed this tx
   * @param {Number} params.nonce
   * @param {Number} params.signature
   * @param {Number} params.signer
   * @param {Object} params.token
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userData = params.user_data;
    oThis.sessionKeyNonce = params.nonce;
    oThis.signature = params.signature;
    oThis.sessionKeyAddress = params.signer;
    oThis.userId = oThis.userData.userId;

    oThis.sessionData = null;
  }

  /**
   * Validate and sanitize input params
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    oThis.rawCalldata = await basicHelper.sanitizeRawCallData(oThis.rawCalldata);

    // TODO - add validation for signature

    if (oThis.userData.saasApiStatus !== tokenUserConstants.saasApiActiveStatus) {
      return oThis._validationError('s_et_fu_1', ['saas_inactive_user_id'], {
        saasApiStatus: oThis.userData.saasApiStatus
      });
    }

    if (oThis.userData.status !== tokenUserConstants.activatedStatus) {
      return oThis._validationError('s_et_fu_2', ['inactive_user_id'], {
        status: oThis.userData.status
      });
    }

    await oThis._validateAndSanitizeSessionKeyAddress();
  }

  /**
   * Set token holder address
   *
   * @private
   */
  _setTokenHolderAddress() {
    const oThis = this;
    oThis.tokenHolderAddress = oThis.userData.tokenHolderAddress;
  }

  /**
   * Set session key address
   * @private
   */
  _setSessionAddress() {
    // do nothing as passed as params
  }

  /**
   * Set session key nonce
   *
   * @private
   */
  _setNonce() {
    // do nothing as passed as params
  }

  /**
   * Set EIP1077 signature
   *
   * @private
   */
  async _setSignature() {
    const oThis = this;

    let messageHash = web3Utils.toEIP1077TransactionHash(oThis.executableTxData);

    let signatureVerifyRsp = await signValidator.validateSignature(
      messageHash,
      oThis.signature,
      oThis.sessionKeyAddress
    );

    if (!signatureVerifyRsp.isValid) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_fu_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_signer_address'],
          debug_options: {
            messageHash: messageHash,
            signature: oThis.signature,
            executableTxData: oThis.executableTxData
          }
        })
      );
    }

    oThis.signatureData = basicHelper.generateRsvFromSignature(oThis.signature);
  }

  /**
   * Verify session spending limit
   *
   * @private
   */
  async _verifySessionSpendingLimit() {
    const oThis = this;

    if (oThis.pessimisticDebitAmount.gte(new BigNumber(oThis.sessionData.spendingLimit))) {
      return oThis._validationError('s_et_fu_4', ['session_key_spending_limit_breached'], {
        spendingLimit: basicHelper.formatWeiToString(oThis.sessionData.spendingLimit),
        pessimisticDebitAmount: basicHelper.formatWeiToString(oThis.pessimisticDebitAmount)
      });
    }
  }

  /**
   * Validate and sanitize session key address
   *
   * @private
   */
  async _validateAndSanitizeSessionKeyAddress() {
    const oThis = this;

    oThis.sessionKeyAddress = oThis.sessionKeyAddress.toLowerCase();

    let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userId,
        shardNumber: oThis.userData.sessionShardNumber,
        addresses: [oThis.sessionKeyAddress]
      }),
      sessionFetchRsp = await sessionsByAddressCache.fetch();

    if (sessionFetchRsp.isFailure()) {
      return Promise.reject(sessionFetchRsp);
    }

    oThis.sessionData = sessionFetchRsp.data[oThis.sessionKeyAddress];

    if (!oThis.sessionData) {
      return oThis._validationError('s_et_b_7', ['invalid_signer_address'], {
        sessionKeyAddress: oThis.sessionKeyAddress
      });
    }

    if (oThis.sessionData.status !== sessionConstants.authorizedStatus) {
      return oThis._validationError('s_et_b_8', ['session_key_not_authorized'], {
        sessionData: oThis.sessionData
      });
    }
  }
}

InstanceComposer.registerAsShadowableClass(ExecuteTxFromUser, coreConstants.icNameSpace, 'ExecuteTxFromUser');

module.exports = {};
