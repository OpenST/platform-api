'use strict';
/**
 * This service gets processes RMQ message for Execute Tx.
 *
 * @module lib/transactions/ProcessRmqMessage
 */

const OSTBase = require('@openstfoundation/openst-base'),
  OpenStJs = require('@openstfoundation/openst.js');

const rootPrefix = '../..',
  InstanceComposer = OSTBase.InstanceComposer,
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

class ProcessRmqExecuteTxMessage {
  /**
   *
   * @param params
   * @param {Number} params.tokenAddressId
   * @param {String} params.transactionUuid
   * @param {Number} params.transactionMetaId
   * @param {Object} params.sequentialExecutorResponse
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenAddressId = params.tokenAddressId;
    oThis.transactionUuid = params.transactionUuid;
    oThis.transactionMetaId = params.transactionMetaId;
    oThis.sequentialExecutorResponse = params.sequentialExecutorResponse;

    oThis.pendingTransactionData = null;
    oThis.configStrategyObj = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.tokenHolderAddress = null;
    oThis.ruleAddress = null;
    oThis.sessionKeyNonce = null;
    oThis.workerNonce = null;
    oThis.eip1077Signature = null;
    oThis.transferExecutableData = null;
    oThis.failureStatusToUpdateInPendingTx = null;
    oThis.failureStatusToUpdateInTxMeta = null;
    oThis.transactionHash = null;
  }

  /**
   * Performer
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(async function(error) {
      let customError;
      if (responseHelper.isCustomResult(error)) {
        customError = error;
      } else {
        logger.error(`${__filename} ::perform::catch`);
        logger.error(error);
        customError = responseHelper.error({
          internal_error_identifier: 'l_t_prm_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {
            error: error.toString()
          }
        });
      }
      await oThis._revertOperations(customError);
      return customError;
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._validateParams();

    await oThis._setWeb3Instance();

    await oThis._submitTransactionToGeth();

    await oThis._markAsSubmitted();

    return responseHelper.successWithData({});
  }

  /**
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');
  }

  /**
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateParams() {
    const oThis = this;

    if (!oThis.transactionUuid || !oThis.sequentialExecutorResponse.address) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.failedToBeRenqueuedStatus;
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    oThis.workerNonce = oThis.sequentialExecutorResponse.nonce;
    if (!CommonValidators.validateInteger(oThis.workerNonce)) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.gethDownStatus;
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let fetchPendingTsRsp = await new FetchPendingTransactionsByUuid(oThis.auxChainId, [
      oThis.transactionUuid
    ]).perform();
    if (fetchPendingTsRsp.isFailure()) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.failedToBeRenqueuedStatus;
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    oThis.pendingTransactionData = fetchPendingTsRsp.data[oThis.transactionUuid];
    if (!oThis.pendingTransactionData) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.finalFailedStatus;
      oThis.failureStatusToUpdateInPendingTx = pendingTransactionConstants.failedStatus;
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_prm_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    oThis.tokenHolderAddress = oThis.pendingTransactionData.toAddress;
    oThis.ruleAddress = oThis.pendingTransactionData.ruleAddress;
    oThis.transferExecutableData = oThis.pendingTransactionData.transferExecutableData;
    oThis.sessionKeyNonce = oThis.pendingTransactionData.sessionKeyNonce;
    oThis.eip1077Signature = oThis.pendingTransactionData.eip1077Signature;

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
            pendingTransactionData: oThis.pendingTransactionData
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
      from: oThis.sequentialExecutorResponse.address,
      to: oThis.tokenHolderAddress,
      nonce: oThis.workerNonce,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: oThis.pendingTransactionData.gasLimit
    };

    let OpenStJsTokenHolderHelper = OpenStJs.Helpers.TokenHolder,
      openStJsTokenHolderHelper = new OpenStJsTokenHolderHelper(oThis.auxWeb3Instance, oThis.tokenHolderAddress);

    let txObject = await openStJsTokenHolderHelper._executeRuleRawTx(
      oThis.pendingTransactionData.ruleAddress,
      oThis.transferExecutableData,
      oThis.sessionKeyNonce,
      oThis.eip1077Signature.r,
      oThis.eip1077Signature.s,
      oThis.eip1077Signature.v
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions
    })
      .perform()
      .catch(async function(submitToGethError) {
        //TODO: Alpesh Sir Remove this after we have error handling inside SubmitTransaction file
        return responseHelper.error({
          internal_error_identifier: 'l_t_prm_6',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            error: submitToGethError.toString()
          }
        });
      });

    if (submitTxRsp && submitTxRsp.isFailure()) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.rollBackBalanceStatus;
      //TODO: Alpesh Sir change this status depending on the error caught in SubmitTransaction file
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
      transactionHash: oThis.transactionHash
    });
  }

  async _revertOperations(response) {
    const oThis = this;

    await new TransactionMetaModel().releaseLockAndMarkStatus({
      status: oThis.failureStatusToUpdateInTxMeta,
      id: oThis.transactionMetaId,
      transactionHash: oThis.transactionHash,
      debugOptions: [response.toHash()]
    });

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
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }

  get auxChainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.auxWeb3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }
}

InstanceComposer.registerAsShadowableClass(
  ProcessRmqExecuteTxMessage,
  coreConstants.icNameSpace,
  'ProcessRmqExecuteTxMessage'
);

module.exports = {};
