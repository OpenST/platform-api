'use strict';
/**
 * This service gets processes RMQ message for Execute Tx.
 *
 * @module lib/transactions/ProcessRmqMessage
 */

const OSTBase = require('@ostdotcom/base'),
  OpenSTJs = require('@openst/openst.js');

const rootPrefix = '../..',
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  pendingTransactionConstant = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  errorConstant = require(rootPrefix + '/lib/globalConstant/error'),
  NonceForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  coreConstant = require(rootPrefix + '/config/coreConstants');

const InstanceComposer = OSTBase.InstanceComposer;

class ProcessRmqExecuteTxMessage {
  /**
   *
   * @param params
   * @param {String} params.transactionUuid
   * @param {Number} params.transactionMetaId
   * @param {String} params.fromAddress
   * @param {Number} params.fromAddressNonce
   * @param {Number} [params.resubmission] - 0 or 1, identifies whether transaction is first time submitted.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.transactionUuid = params.transactionUuid;
    oThis.transactionMetaId = params.transactionMetaId;
    oThis.fromAddress = params.fromAddress;
    oThis.fromAddressNonce = params.fromAddressNonce;

    oThis.resubmission = params.resubmission || 0;

    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.tokenHolderAddress = null;
    oThis.ruleAddress = null;
    oThis.sessionKeyAddress = null;
    oThis.sessionKeyNonce = null;
    oThis.eip1077Signature = null;
    oThis.transferExecutableData = null;
    oThis.failureStatusToUpdateInTxMeta = null;
    oThis.transactionHash = null;
    oThis.gas = null;
  }

  /**
   * Performer
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(async function(error) {
      let errorToReturn;
      if (responseHelper.isCustomResult(error)) {
        errorToReturn = error;
      } else {
        logger.error(`${__filename} ::perform::catch`);
        logger.error(error);
        errorToReturn = responseHelper.error({
          internal_error_identifier: 'l_t_prm_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {
            error: error.toString()
          }
        });
      }

      // ensure that revert happens on error.
      await oThis._revertOperations(errorToReturn);

      return errorToReturn;
    });
  }

  /**
   * async perform
   *
   * @return {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._validateParams();

    await oThis._fetchPendingTransactionData();

    await oThis._submitTransactionToGeth();

    await oThis._markAsSubmitted();
  }

  /**
   * Initialize vars
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');
    oThis.auxWeb3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * Validate params
   *
   * @return {Promise<never>}
   * @private
   */
  async _validateParams() {
    const oThis = this;

    if (
      !CommonValidators.validateUuidV4(oThis.transactionUuid) ||
      !CommonValidators.validateNonZeroInteger(oThis.transactionMetaId) ||
      !CommonValidators.validateEthAddress(oThis.fromAddress) ||
      !CommonValidators.validateInteger(oThis.fromAddressNonce)
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  /**
   * fetch pending tx data from ddb
   *
   * @private
   */
  async _fetchPendingTransactionData() {
    const oThis = this;

    let fetchPendingTsRsp;
    fetchPendingTsRsp = await new FetchPendingTransactionsByUuid(oThis.auxChainId, [oThis.transactionUuid])
      .perform()
      .catch(async function(error) {
        fetchPendingTsRsp = error;
      });

    if (fetchPendingTsRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let pendingTx = fetchPendingTsRsp.data[oThis.transactionUuid];
    if (!pendingTx) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.finalFailedStatus;
      // nothing can be done in pending tx as no record was not found there.
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    oThis.tokenHolderAddress = pendingTx.toAddress;
    oThis.ruleAddress = oThis.auxWeb3Instance.utils.toChecksumAddress(pendingTx.ruleAddress);
    oThis.transferExecutableData = pendingTx.transferExecutableData;
    oThis.sessionKeyNonce = pendingTx.sessionKeyNonce;
    oThis.sessionKeyAddress = pendingTx.sessionKeyAddress;
    oThis.eip1077Signature = pendingTx.eip1077Signature;
    oThis.gas = pendingTx.gasLimit;

    if (
      !oThis.tokenHolderAddress ||
      !oThis.ruleAddress ||
      !oThis.transferExecutableData ||
      !oThis.eip1077Signature ||
      CommonValidators.isVarNull(oThis.sessionKeyNonce) ||
      CommonValidators.isVarNull(oThis.sessionKeyAddress) ||
      !oThis.eip1077Signature.r ||
      !oThis.eip1077Signature.s ||
      !oThis.eip1077Signature.v ||
      !oThis.gas
    ) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.rollBackBalanceStatus;
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            pendingTransactionData: pendingTx
          }
        })
      );
    }
  }

  /**
   *
   * Submit Tx to Geth
   *
   * @private
   */
  async _submitTransactionToGeth() {
    const oThis = this;

    let txOptions = {
      to: oThis.tokenHolderAddress,
      from: oThis.fromAddress,
      nonce: oThis.fromAddressNonce,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: oThis.gas
    };

    let OpenSTJsTokenHolderHelper = OpenSTJs.Helpers.TokenHolder,
      openSTJsTokenHolderHelper = new OpenSTJsTokenHolderHelper(oThis.auxWeb3Instance, oThis.tokenHolderAddress);

    // get raw tx for execute rule
    let txObject = openSTJsTokenHolderHelper._executeRuleRawTx(
      oThis.ruleAddress,
      oThis.transferExecutableData,
      oThis.sessionKeyNonce,
      oThis.eip1077Signature.r,
      oThis.eip1077Signature.s,
      oThis.eip1077Signature.v
    );

    txOptions.data = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions
    })
      .perform()
      .catch(async function(submitToGethError) {
        logger.error('submitToGethError', submitToGethError);
        return submitToGethError;
      });

    if (submitTxRsp && submitTxRsp.isFailure()) {
      oThis._setFailureStatus(submitTxRsp);
      return Promise.reject(submitTxRsp);
    }

    oThis.transactionHash = submitTxRsp.data.transactionHash;
  }

  /**
   * Set failure status to be set in tx meta
   *
   * @param submitTxRsp
   * @private
   */
  _setFailureStatus(submitTxRsp) {
    const oThis = this;

    // depending on the internal error code, decide on the failure status to update in tx meta
    if (submitTxRsp.internalErrorCode.indexOf(errorConstant.gethDown) > 0) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.gethDownStatus;
    } else if (submitTxRsp.internalErrorCode.indexOf(errorConstant.insufficientGas) > 0) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.insufficientGasStatus;
    } else if (submitTxRsp.internalErrorCode.indexOf(errorConstant.nonceTooLow) > 0) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.nonceTooLowStatus;
    } else if (submitTxRsp.internalErrorCode.indexOf(errorConstant.replacementTxUnderpriced) > 0) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.replacementTxUnderpricedStatus;
    } else if (submitTxRsp.internalErrorCode.indexOf(errorConstant.gethOutOfSync) > 0) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.gethOutOfSyncStatus;
    } else {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.unknownGethSubmissionErrorStatus;
    }
  }

  /**
   * mark status as submitted in meta
   * @private
   */
  async _markAsSubmitted() {
    const oThis = this;

    // change status in pending tx
    await new PendingTransactionCrud(oThis.auxChainId)
      .update({
        transactionUuid: oThis.transactionUuid,
        transactionHash: oThis.transactionHash,
        status: pendingTransactionConstant.submittedStatus
      })
      .catch(async function(updatePendingTxError) {
        logger.error('_markAsSubmitted errored in ProcessRmqMessage', updatePendingTxError);
        // Do nothing as tx has already been submitted to Geth
        // Hash would be updated in meta
      });

    let metaParams = {
      status: transactionMetaConst.submittedToGethStatus,
      id: oThis.transactionMetaId,
      transactionHash: oThis.transactionHash,
      senderAddress: oThis.fromAddress,
      senderNonce: oThis.fromAddressNonce
    };

    if (oThis.resubmission) {
      metaParams.increseRetryCount = 1;
    }

    return new TransactionMetaModel().updateRecordsByReleasingLock(metaParams);
  }

  /**
   * Revert operations
   *
   * @param response
   * @return {Promise<void>}
   * @private
   */
  async _revertOperations(response) {
    const oThis = this;

    let metaUpdateParams = {
      status: oThis.failureStatusToUpdateInTxMeta || transactionMetaConst.rollBackBalanceStatus,
      id: oThis.transactionMetaId,
      transactionHash: oThis.transactionHash,
      senderAddress: oThis.fromAddress,
      senderNonce: oThis.fromAddressNonce,
      debugParams: [response.toHash()]
    };

    //NOTE: It is important to NOT set receiptStatus here if we had transactionHash (after mining of tx code handles it)
    if (!metaUpdateParams.transactionHash) {
      metaUpdateParams.receiptStatus = transactionMetaConst.failureReceiptStatus;
    }

    await new TransactionMetaModel().updateRecordsByReleasingLock(metaUpdateParams);

    return new NonceForSession({
      address: oThis.sessionKeyAddress,
      chainId: oThis.auxChainId
    }).clear();
  }

  /**
   * Object of config strategy class
   *
   * @return {null|ConfigStrategyObject}
   * @private
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis._configStrategyObj) return oThis._configStrategyObj;

    oThis._configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis._configStrategyObj;
  }

  /**
   * aux chain id
   *
   * @return {*}
   */
  get auxChainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }
}

InstanceComposer.registerAsShadowableClass(
  ProcessRmqExecuteTxMessage,
  coreConstant.icNameSpace,
  'ProcessRmqExecuteTxMessage'
);

module.exports = {};
