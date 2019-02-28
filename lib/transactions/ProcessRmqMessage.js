'use strict';
/**
 * This service gets processes RMQ message for Execute Tx.
 *
 * @module lib/transactions/ProcessRmqMessage
 */

const OSTBase = require('@openstfoundation/openst-base'),
  OpenStJs = require('@openstfoundation/openst.js');

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  errorConstant = require(rootPrefix + '/lib/globalConstant/error'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud');

const InstanceComposer = OSTBase.InstanceComposer;

class ProcessRmqExecuteTxMessage {
  /**
   *
   * @param params
   * @param {String} params.transactionUuid
   * @param {Number} params.transactionMetaId
   * @param {String} params.fromAddress
   * @param {Number} params.fromAddressNonce
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.transactionUuid = params.transactionUuid;
    oThis.transactionMetaId = params.transactionMetaId;
    oThis.fromAddress = params.fromAddress;
    oThis.fromAddressNonce = params.fromAddressNonce;

    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.tokenHolderAddress = null;
    oThis.ruleAddress = null;
    oThis.sessionKeyNonce = null;
    oThis.eip1077Signature = null;
    oThis.transferExecutableData = null;
    oThis.failureStatusToUpdateInPendingTx = null;
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

    if (!oThis.transactionUuid || !oThis.fromAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_1',
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

    let pendingTransactionData = fetchPendingTsRsp.data[oThis.transactionUuid];
    if (!pendingTransactionData) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.finalFailedStatus;
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    oThis.tokenHolderAddress = pendingTransactionData.toAddress;
    oThis.ruleAddress = oThis.auxWeb3Instance.utils.toChecksumAddress(pendingTransactionData.ruleAddress);
    oThis.transferExecutableData = pendingTransactionData.transferExecutableData;
    oThis.sessionKeyNonce = pendingTransactionData.sessionKeyNonce;
    oThis.eip1077Signature = pendingTransactionData.eip1077Signature;
    oThis.gas = pendingTransactionData.gasLimit;

    if (
      !oThis.tokenHolderAddress ||
      !oThis.ruleAddress ||
      !oThis.transferExecutableData ||
      !oThis.eip1077Signature ||
      !oThis.eip1077Signature.r ||
      !oThis.eip1077Signature.s ||
      !oThis.eip1077Signature.v
    ) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.rollBackBalanceStatus;
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            pendingTransactionData: pendingTransactionData
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

    let OpenStJsTokenHolderHelper = OpenStJs.Helpers.TokenHolder,
      openStJsTokenHolderHelper = new OpenStJsTokenHolderHelper(oThis.auxWeb3Instance, oThis.tokenHolderAddress),
      txObject;

    // get raw tx for execute rule
    txObject = openStJsTokenHolderHelper._executeRuleRawTx(
      oThis.ruleAddress,
      oThis.transferExecutableData,
      oThis.sessionKeyNonce,
      oThis.eip1077Signature.r,
      oThis.eip1077Signature.s,
      oThis.eip1077Signature.v
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp;

    submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions
    })
      .perform()
      .catch(async function(submitToGethError) {
        return submitToGethError;
      });

    if (submitTxRsp && submitTxRsp.isFailure()) {
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

      return Promise.reject(submitTxRsp);
    }

    oThis.transactionHash = submitTxRsp.data.transactionHash;
  }

  /**
   * mark status as submitted in meta
   * @private
   */
  async _markAsSubmitted() {
    const oThis = this;

    new PendingTransactionCrud(oThis.auxChainId)
      .update({
        transactionUuid: oThis.transactionUuid,
        transactionHash: oThis.transactionHash,
        status: pendingTransactionConstants.submittedStatus
      })
      .catch(async function(updatePendingTxError) {
        // Do nothing as tx has already been submitted to Geth
        // Hash would be updated in meta
      });

    await new TransactionMetaModel().releaseLockAndMarkStatus({
      status: transactionMetaConst.submittedToGethStatus,
      id: oThis.transactionMetaId,
      transactionHash: oThis.transactionHash,
      senderAddress: oThis.fromAddress,
      senderNonce: oThis.fromAddressNonce
    });
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

    await new TransactionMetaModel().releaseLockAndMarkStatus({
      status: oThis.failureStatusToUpdateInTxMeta || transactionMetaConst.rollBackBalanceStatus,
      id: oThis.transactionMetaId,
      transactionHash: oThis.transactionHash,
      debugParams: [response.toHash()]
    });

    //TODO: need to set oThis.failureStatusToUpdateInPendingTx
    if (oThis.failureStatusToUpdateInPendingTx) {
      new PendingTransactionCrud(oThis.auxChainId)
        .update({
          transactionUuid: oThis.transactionUuid,
          transactionHash: oThis.transactionHash,
          status: oThis.failureStatusToUpdateInPendingTx
        })
        .catch(async function(updatePendingTxError) {
          // Do nothing
        });
    }
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

  get auxChainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }
}

InstanceComposer.registerAsShadowableClass(
  ProcessRmqExecuteTxMessage,
  coreConstants.icNameSpace,
  'ProcessRmqExecuteTxMessage'
);

module.exports = {};
