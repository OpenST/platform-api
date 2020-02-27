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
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  signValidator = require(rootPrefix + '/lib/validators/Sign'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
  UserRecoveryOperationsCache = require(rootPrefix + '/lib/cacheManagement/shared/UserPendingRecoveryOperations'),
  ExecuteTxBase = require(rootPrefix + '/app/services/transaction/execute/Base');

require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');
require(rootPrefix + '/lib/redemption/ValidateUserRedemptionTx');
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserRedemptionsByUuid');
require(rootPrefix + '/lib/cacheManagement/chain/RedemptionIdsByUserId');

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
   * @param {Object} params.token_shard_details - token shard details
   * @param {Number} params.nonce
   * @param {Number} params.signature
   * @param {Number} params.signer
   * @param {Object} params.token
   * @param {Object} params.redemption_meta
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userData = params.user_data;
    oThis.tokenShardDetails = params.token_shard_details;
    oThis.sessionKeyNonce = params.nonce;
    oThis.signature = params.signature;
    oThis.sessionKeyAddress = params.signer;
    oThis.userId = oThis.userData.userId;
    oThis.redemptionDetails = params.redemption_meta;
    oThis.redemptionEmail = null;

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
    if (!CommonValidators.validateRawCallData(oThis.rawCalldata)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_et_fu_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata'],
          debug_options: {}
        })
      );
    }

    if (oThis.userData.saasApiStatus !== tokenUserConstants.saasApiActiveStatus) {
      return oThis._validationError('a_s_et_fu_2', ['saas_inactive_user_id'], {
        saasApiStatus: oThis.userData.saasApiStatus
      });
    }

    if (oThis.userData.status !== tokenUserConstants.activatedStatus) {
      return oThis._validationError('a_s_et_fu_3', ['inactive_user_id'], {
        status: oThis.userData.status
      });
    }

    if (oThis.userData.tokenHolderStatus !== tokenUserConstants.tokenHolderActiveStatus) {
      return oThis._validationError('a_s_et_fu_4', ['invalid_signer'], {
        status: oThis.userData.tokenHolderStatus
      });
    }

    await oThis._validatePendingRecoveryOperation();

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
   *
   * set user data for oThis.userId
   *
   * @private
   */
  _setCurrentUserData() {
    // do nothing as passed as params
  }

  /**
   *
   * set token shard details
   *
   * @private
   */
  _setTokenShardDetails() {
    // do nothing as passed as params
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
          internal_error_identifier: 'a_s_et_fu_5',
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

    if (oThis.pessimisticDebitAmount.gt(new BigNumber(oThis.sessionData.spendingLimit))) {
      return oThis._validationError('a_s_et_fu_6', ['session_key_spending_limit_breached'], {
        spendingLimit: basicHelper.formatWeiToString(oThis.sessionData.spendingLimit),
        pessimisticDebitAmount: basicHelper.formatWeiToString(oThis.pessimisticDebitAmount)
      });
    }
  }

  /**
   * Validate any pending recovery operation of user.
   *
   * @returns {Promise}
   * @private
   */
  async _validatePendingRecoveryOperation() {
    const oThis = this;

    let recoveryOperationsResp = await new UserRecoveryOperationsCache({
        tokenId: oThis.tokenId,
        userId: oThis.userId
      }).fetch(),
      recoveryOperations = recoveryOperationsResp.data.recoveryOperations || [];

    if (recoveryOperations.length > 0) {
      return oThis._validationError('a_s_et_fu_7', ['user_recovery_pending'], {
        userId: oThis.userId
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

    oThis.sessionKeyAddress = basicHelper.sanitizeAddress(oThis.sessionKeyAddress);

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
      return oThis._validationError('a_s_et_fu_8', ['invalid_signer_address'], {
        sessionKeyAddress: oThis.sessionKeyAddress
      });
    }

    if (oThis.sessionData.status !== sessionConstants.authorizedStatus) {
      return oThis._validationError('a_s_et_fu_9', ['session_key_not_authorized'], {
        sessionData: oThis.sessionData
      });
    }
  }

  /**
   * Custom validations over executable data
   *
   * @returns {Promise<void>}
   * @private
   */
  async _customValidationsOnExecutableData() {
    // In this we will apply further validations on user to company transactions like Redemptions
    const oThis = this;

    // If redemption details map is empty, then no need to validate
    if (!CommonValidators.validateObject(oThis.redemptionDetails)) {
      return;
    }

    const ValidateUserRedemptionTx = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'ValidateUserRedemptionTx');
    let redemptionResponse = await new ValidateUserRedemptionTx({
      clientId: oThis.clientId,
      tokenId: oThis.tokenId,
      redemptionDetails: oThis.redemptionDetails,
      transfersData: oThis.estimatedTransfers,
      metaProperty: oThis.metaProperty,
      token: oThis.token
    }).perform();

    if (redemptionResponse.isSuccess() && redemptionResponse.data.redemptionDetails) {
      oThis.redemptionDetails = redemptionResponse.data.redemptionDetails;
      oThis.redemptionEmail = redemptionResponse.data.redemptionEmail;
    }
  }

  /**
   * Create User Redemption request, if transaction is for redemption
   *
   * @returns {Promise<void>}
   * @private
   */
  async _createUserRedemptionRequest() {
    const oThis = this;

    if (CommonValidators.validateObject(oThis.redemptionDetails)) {
      await new UserRedemptionModel({}).insertRedemptionRequest({
        uuid: oThis.redemptionDetails.redemptionId,
        userId: oThis.userId,
        redemptionProductId: oThis.redemptionDetails.redemptionProductId,
        transactionUuid: oThis.transactionUuid,
        amount: oThis.redemptionDetails['amount'],
        countryId: oThis.redemptionDetails['countryId'],
        status: userRedemptionConstants.redemptionProcessingStatus,
        emailAddressEncrypted: oThis.redemptionEmail
      });

      const UserRedemptionsByUuidCacheKlass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid');
      await new UserRedemptionsByUuidCacheKlass({ uuids: [oThis.redemptionDetails.redemptionId] }).clear();

      const RedemptionIdsByUserIdCacheKlass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'RedemptionIdsByUserId');
      await new RedemptionIdsByUserIdCacheKlass({ userId: oThis.userId }).clear();

      await oThis._sendRedemptionInitiateWebhook();
    }
  }

  /**
   * sendRedemption Initiate Webhook
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendRedemptionInitiateWebhook() {
    const oThis = this;

    const payload = {
      userId: oThis.userId,
      webhookKind: webhookSubscriptionsConstants.redemptionInitiatedTopic,
      clientId: oThis.clientId,
      userRedemptionUuid: oThis.redemptionDetails.redemptionId
    };

    return publishToPreProcessor.perform(oThis.auxChainId, payload);
  }
}

InstanceComposer.registerAsShadowableClass(ExecuteTxFromUser, coreConstants.icNameSpace, 'ExecuteTxFromUser');

module.exports = {};
