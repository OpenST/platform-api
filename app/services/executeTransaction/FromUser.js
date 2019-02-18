'use strict';

/**
 * This service executes User Transaction
 *
 * @module app/services/executeTransaction/FromUser
 */

const BigNumber = require('bignumber.js');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ExecuteTxBase = require(rootPrefix + '/app/services/executeTransaction/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

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
   * @param {Object} params.token_id
   * @param {Object} params.user_data - data of user who signed this tx
   * @param {String} params.executable_data - executable_data json string
   * @param {Number} params.operation_type
   * @param {Number} params.nonce
   * @param {Number} params.signature
   * @param {Number} params.signer
   * @param {Object} params.meta_property
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userData = params.user_data;
    oThis.nonce = params.nonce;
    oThis.signature = params.signature;
    oThis.sessionKeyAddress = params.signer;
    oThis.userId = oThis.userData.userId;

    oThis.sessionData = null;
    oThis.toAddress = null;
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    await oThis._initializeVars();

    await oThis._processExecutableData();

    await oThis._setSessionAddress();

    await oThis._setNonce();

    await oThis._setSignature();

    await oThis._verifySessionSpendingLimit();

    await oThis._performPessimisticDebit();

    await oThis._createPendingTransaction();

    await oThis._publishToRMQ();

    return Promise.resolve(
      responseHelper.successWithData({
        transactionUuid: oThis.transactionUuid //TODO: To change after discussions
      })
    );
  }

  /**
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;
    await oThis._validateAndSanitizeSessionKeyAddress();
  }

  /**
   *
   * @private
   */
  _setTokenHolderAddress() {
    const oThis = this;
    oThis.tokenHolderAddress = oThis.userData.tokenHolderAddress;
  }

  /**
   *
   * @private
   */
  _setSessionAddress() {
    // do nothing as passed as params
  }

  /**
   *
   * @private
   */
  _setNonce() {
    // do nothing as passed as params
  }

  _setSignature() {
    const oThis = this;
    oThis.signatureData = {
      signature: oThis.signature
    };
  }

  /**
   *
   * @private
   */
  async _verifySessionSpendingLimit() {
    const oThis = this;

    if (oThis.pessimisticDebitAmount.gte(new BigNumber(oThis.sessionData.spendingLimit))) {
      return oThis._validationError('s_et_fu_2', ['session_key_spending_limit_breached'], {
        spendingLimit: oThis.sessionData.spendingLimit.toString(10),
        pessimisticDebitAmount: oThis.pessimisticDebitAmount.toString(10)
      });
    }
  }

  /**
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
