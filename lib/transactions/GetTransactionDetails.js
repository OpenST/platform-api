'use strict';

/**
 * Get transaction details.
 *
 * @module lib/transactions/GetTransactionDetails
 */

const BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base');

const rootPrefix = '../..',
  ChainDetails = require(rootPrefix + '/app/services/chain/Get'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  RuleNameByRuleId = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/RuleNameByRuleId'),
  FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  pendingTransaction = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserDetail');

/**
 *
 * @class GetTransactionDetails
 */
class GetTransactionDetails {
  /**
   *
   * @param {Object} params
   * @param {Integer} params.chainId
   * @param {Object} params.esSearchResponse
   * @param {Integer} params.tokenId
   */
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.tokenId = params.tokenId;
    oThis.esSearchResponse = params.esSearchResponse;

    oThis.blockScanner = null;
    oThis.blockHeight = null;

    oThis.uuidsToFetchFromPendingTx = [];
    oThis.txHashes = [];
    oThis.missingTxUuids = [];
    oThis.sortedTransactionUuids = [];
    oThis.uuidToTxDetailsMap = {};
    oThis.ruleIdToTxUuidMap = {};
    oThis.ruleIds = [];
    oThis.tokenHolderAddresses = [];
    oThis.rulesData = {};
    oThis.userDetails = {};
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._setBlockScannerInstance();

    // Block height is needed for confirmations.
    await oThis._getBlockHeight();

    await oThis._checkTxHashStatus();

    await oThis._fetchTxFromPendingTxTable();

    await oThis._fetchTxFromTxTable();

    await oThis._fetchRulesData();

    await oThis._fetchUserDetails();

    return oThis._formatResponse();
  }

  /**
   * Set block-scanner instance.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setBlockScannerInstance() {
    const oThis = this;
    oThis.blockScanner = await blockScannerProvider.getInstance([oThis.chainId]);
  }

  /**
   * Get block height.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getBlockHeight() {
    const oThis = this;

    let chainDetailsObj = new ChainDetails({ chain_id: oThis.chainId }),
      chainDetailsRsp = await chainDetailsObj.perform();

    if (chainDetailsRsp.isFailure()) {
      return Promise.reject(chainDetailsRsp);
    }

    oThis.blockHeight = chainDetailsRsp.data.chain.blockHeight;
  }

  /**
   * Check transaction status and determine wheter to go to pending tx table or transactions table
   *
   * @returns {Promise<void>}
   * @private
   */
  async _checkTxHashStatus() {
    const oThis = this,
      intSuccessStatus = +pendingTransactionConstants.invertedStatuses[pendingTransactionConstants.successStatus],
      intFailedStatus = +pendingTransactionConstants.invertedStatuses[pendingTransactionConstants.failedStatus],
      transactionsFromEs = oThis.esSearchResponse.data[oThis.chainId + '_transactions']; //Get this from core constants.

    for (let index = 0; index < transactionsFromEs.length; index++) {
      let currentTransaction = transactionsFromEs[index];

      // To maintain order, we preserve it in an array
      oThis.sortedTransactionUuids.push(currentTransaction.id);

      // Fetch from transactions table if status is success OR if status is failed and transaction hash is present
      // This is because, failure can happen before submit and in this case, the entry won't be present in transactions table
      let fetchFromTransactionTable =
        currentTransaction.status === intSuccessStatus ||
        (currentTransaction.status === intFailedStatus &&
          !CommonValidators.isVarNull(currentTransaction.transaction_hash));

      if (fetchFromTransactionTable) {
        oThis.txHashes.push(currentTransaction.transaction_hash);
      } else {
        oThis.uuidsToFetchFromPendingTx.push(currentTransaction.id);
      }
    }
  }

  /**
   * Get pending transactions data.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTxFromPendingTxTable() {
    const oThis = this;

    if (!oThis.uuidsToFetchFromPendingTx.length) return;

    const fetchPendingTxByUuidObj = new FetchPendingTransactionsByUuid(oThis.chainId, oThis.uuidsToFetchFromPendingTx),
      pendingTxResponse = await fetchPendingTxByUuidObj.perform();

    if (pendingTxResponse.isFailure()) return Promise.reject(pendingTxResponse);

    let pendingTransactionsMap = pendingTxResponse.data;

    for (let index = 0; index < oThis.uuidsToFetchFromPendingTx.length; index++) {
      let currentTxUuid = oThis.uuidsToFetchFromPendingTx[index];

      if (!pendingTransactionsMap[currentTxUuid]) {
        oThis.missingTxUuids.push(currentTxUuid);
        logger.error('currentTxUuid found missing:', currentTxUuid);
        continue;
      }

      let txDetails = pendingTransactionsMap[currentTxUuid],
        blockNo = txDetails.blockNumber || 0,
        gasPrice = txDetails.gasPrice || 0,
        gasUsed = txDetails.gasUsed || 0;

      txDetails.transactionUuid = currentTxUuid;

      txDetails.blockConfirmation = oThis._getBlockConfirmation(blockNo);

      txDetails.transactionFee = oThis._getTransactionFee(gasUsed, gasPrice);

      // Insert tokenHolders into an array if transfers are present.
      if (txDetails.transfers) {
        for (let i = 0; i < txDetails.transfers.length; i++) {
          let transferDetails = txDetails.transfers[i];

          oThis.tokenHolderAddresses.push(transferDetails.fromAddress);
          oThis.tokenHolderAddresses.push(transferDetails.toAddress);
        }
      }

      oThis.ruleIds.push(txDetails.ruleId);
      oThis.uuidToTxDetailsMap[currentTxUuid] = txDetails;
    }

    logger.debug(' ===== oThis.uuidToTxDetailsMap', oThis.uuidToTxDetailsMap);
  }

  /**
   * If transaction details are not present in pending transactions, fetch from txDetails.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTxFromTxTable() {
    const oThis = this;

    if (!oThis.txHashes.length) return;

    let getDetailsFromDdbObj = new GetDetailsFromDDB({
        chainId: oThis.chainId,
        transactionHashes: oThis.txHashes
      }),
      dbResponse = await getDetailsFromDdbObj.perform();

    if (dbResponse.isFailure()) return Promise.reject(dbResponse);

    let txMap = dbResponse.data;

    let transfersResponse = await oThis._fetchTransfers(),
      transactionTransfersMap = transfersResponse.data;

    for (let txHash in txMap) {
      let txDetails = txMap[txHash],
        transactionUuid = txDetails.transactionUuid,
        blockNo = txDetails.blockNumber,
        gasPrice = txDetails.gasPrice || 0,
        gasUsed = txDetails.gasUsed || 0;

      txDetails.transactionFee = oThis._getTransactionFee(gasUsed, gasPrice);

      txDetails.blockConfirmation = oThis._getBlockConfirmation(blockNo);

      if (Number(txDetails.transactionStatus) & Number(txDetails.transactionInternalStatus)) {
        if (CommonValidators.validateObject(transactionTransfersMap[txHash])) {
          let transferResponseData = transactionTransfersMap[txHash];
          txDetails.transfers = oThis._setTransfers(transferResponseData);
        }
        txDetails.status = pendingTransaction.successStatus;
      } else {
        txDetails.status = pendingTransaction.failedStatus;
      }

      oThis.ruleIds.push(txDetails.ruleId);
      oThis.uuidToTxDetailsMap[transactionUuid] = txDetails;
    }
    logger.debug(' ===== oThis.uuidToTxDetailsMap', oThis.uuidToTxDetailsMap);
  }

  /**
   * Fetch transfers from dynamo.
   *
   * @returns {Promise<void>}
   * @private
   */
  _fetchTransfers() {
    const oThis = this,
      GetTransferDetail = oThis.blockScanner.transfer.GetAll,
      getTransferDetailObj = new GetTransferDetail(oThis.chainId, oThis.txHashes);

    return getTransferDetailObj.perform();
  }

  /**
   * Set transfers in transaction details
   *
   * @private
   */
  _setTransfers(transferDetails) {
    const oThis = this,
      totalTransfers = [];

    for (let transferIndex in transferDetails) {
      let transfers = transferDetails[transferIndex];

      oThis.tokenHolderAddresses.push(transfers.fromAddress);
      oThis.tokenHolderAddresses.push(transfers.toAddress);

      totalTransfers.push(transfers);
    }
    return totalTransfers;
  }

  /**
   * Set userIds and rule names into transaction details to format the response of the lib
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _formatResponse() {
    const oThis = this,
      transactions = [];

    for (let index = 0; index < oThis.sortedTransactionUuids.length; index++) {
      let txUuid = oThis.sortedTransactionUuids[index],
        txDetailsForUuid = oThis.uuidToTxDetailsMap[txUuid];

      if (!txDetailsForUuid) continue;

      let ruleId = txDetailsForUuid.ruleId,
        ruleName = oThis.rulesData[ruleId] && oThis.rulesData[ruleId].name,
        transfersArray = [];

      if (txDetailsForUuid.transfers && txDetailsForUuid.transfers.length) {
        for (let i = 0; i < txDetailsForUuid.transfers.length; i++) {
          let transfer = txDetailsForUuid.transfers[i];

          transfersArray.push({
            fromAddress: transfer.fromAddress,
            fromUserId: (oThis.userDetails[transfer.fromAddress] || {}).userId,
            toAddress: transfer.toAddress,
            toUserId: (oThis.userDetails[transfer.toAddress] || {}).userId,
            amount: transfer.value || transfer.amount // value in pending transactions And amount in case of transfers table.
          });
        }
      }

      txDetailsForUuid.ruleName = ruleName;
      txDetailsForUuid.transfers = transfersArray;

      transactions.push(txDetailsForUuid);
    }

    return responseHelper.successWithData(transactions);
  }

  /**
   * Fetch rules
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchRulesData() {
    const oThis = this;

    if (!oThis.ruleIds.length) return;

    oThis.ruleIds = [...new Set(oThis.ruleIds)];

    const ruleNameResponse = await new RuleNameByRuleId({ ruleIds: oThis.ruleIds }).fetch();

    oThis.rulesData = ruleNameResponse.data || {};
  }

  /**
   * Fetch user details
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchUserDetails() {
    const oThis = this;

    if (!oThis.tokenHolderAddresses.length) return;

    oThis.tokenHolderAddresses = [...new Set(oThis.tokenHolderAddresses)];

    const UserDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserDetailCache'),
      userDetail = await new UserDetailCache({
        tokenHolderAddresses: oThis.tokenHolderAddresses,
        tokenId: oThis.tokenId
      }).fetch();

    oThis.userDetails = userDetail.data || {};
  }

  /**
   * Get block confirmation.
   *
   * @param blockNo
   * @returns {number}
   * @private
   */
  _getBlockConfirmation(blockNo) {
    const oThis = this;

    if (oThis.blockHeight > blockNo) {
      return oThis.blockHeight - blockNo;
    } else {
      return 0;
    }
  }

  /**
   * Returns transaction fee.
   *
   * @param {Number} gasUsed
   * @param {String} gasPrice
   * @returns {BigNumber}
   * @private
   */
  _getTransactionFee(gasUsed, gasPrice) {
    const gasPriceBn = new BigNumber(gasPrice),
      gasUsedBn = new BigNumber(gasUsed);

    return gasPriceBn.mul(gasUsedBn);
  }
}

InstanceComposer.registerAsShadowableClass(GetTransactionDetails, coreConstants.icNameSpace, 'GetTransactionDetails');

module.exports = {};
