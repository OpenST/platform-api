'use strict';

/**
 * Get transaction details.
 *
 * @module lib/transactions/GetTransactionDetails
 */

const BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ChainDetails = require(rootPrefix + '/app/services/chain/Get'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  pendingTransaction = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  RuleNameByRuleId = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/RuleNameByRuleId'),
  FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid');

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
   * @param {Object} params.esSearchData
   * @param {Array} params.pendingTransactionUuids
   * @param {Integer} params.tokenId
   */
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.esSearchData = params.esSearchData;
    oThis.pendingTransactionUuids = params.pendingTransactionUuids || [];
    oThis.tokenId = params.tokenId || null;

    oThis.txTransactionHashes = [];

    oThis.missingTxUuids = [];
    oThis.blockScanner = null;
    oThis.finalTransactionDetails = {};
    oThis.blockHeight = null;
    oThis.ruleIdToTxUuidMap = {};
    oThis.ruleIds = [];
    oThis.tokenHolderAddresses = [];
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._setBlockScannerInstance();

    await oThis._getBlockHeight();

    await oThis._checkTxHashStatus();

    if (oThis.pendingTransactionUuids.length) {
      await oThis._getPendingTx();
    } else if (oThis.txTransactionHashes.length) {
      await oThis._fetchTxDetailsFromBlockScanner(); // Merge missing transactionHashes here.
    }

    await oThis._setUserIdsAndRuleNames();

    return responseHelper.successWithData(oThis.finalTransactionDetails);
  }

  /**
   * Check txHash status.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _checkTxHashStatus() {
    const oThis = this,
      invertedCreatedStatus = +pendingTransactionConstants.invertedStatuses[pendingTransactionConstants.createdStatus],
      invertedSubmittedStatus = +pendingTransactionConstants.invertedStatuses[
        pendingTransactionConstants.submittedStatus
      ],
      invertedMinedStatus = +pendingTransactionConstants.invertedStatuses[pendingTransactionConstants.minedStatus],
      transactionsFromEs = oThis.esSearchData.data[oThis.chainId + '_transactions']; //Get this from core constants.

    // Here, one user Id will always have same token id. So Used first element.
    oThis.tokenId = oThis.tokenId || transactionsFromEs[0].token_id;

    for (let index = 0; index < transactionsFromEs.length; index++) {
      let currentTransaction = transactionsFromEs[index];

      if (
        currentTransaction.status === invertedCreatedStatus ||
        currentTransaction.status === invertedSubmittedStatus ||
        currentTransaction.status === invertedMinedStatus
      ) {
        oThis.pendingTransactionUuids.push(currentTransaction.id);
      } else {
        oThis.txTransactionHashes.push(currentTransaction.transaction_hash);
      }
    }

    logger.debug('==== oThis.pendingTransactionUuids ====', oThis.pendingTransactionUuids);
    logger.debug('==== oThis.txTransactionHashes ====', oThis.txTransactionHashes);
  }

  /**
   * Get pending transactions data.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getPendingTx() {
    const oThis = this,
      fetchPendingTxByUuidObj = new FetchPendingTransactionsByUuid(oThis.chainId, oThis.pendingTransactionUuids),
      pendingTxHashesResponse = await fetchPendingTxByUuidObj.perform();

    logger.log('====== pendingTxHashesResponse =======', pendingTxHashesResponse);

    let pendingTxHashesResponseData = null;

    if (pendingTxHashesResponse.isSuccess()) {
      pendingTxHashesResponseData = pendingTxHashesResponse.data;
    } else {
      return Promise.reject(pendingTxHashesResponse);
    }

    for (let index = 0; index < oThis.pendingTransactionUuids.length; index++) {
      let currentTxUuid = oThis.pendingTransactionUuids[index];

      if (!pendingTxHashesResponseData[currentTxUuid]) {
        oThis.missingTxUuids.push(currentTxUuid);
      } else {
        let transactionHashDetails = pendingTxHashesResponseData[currentTxUuid],
          transactionBlockNo = transactionHashDetails.blockNumber || 0,
          gasPrice = transactionHashDetails.gasPrice || 0,
          gasUsed = transactionHashDetails.gasUsed || 0;

        // Insert transactionUuid.
        transactionHashDetails['transactionUuid'] = currentTxUuid;

        // Get block confirmation
        transactionHashDetails['blockConfirmation'] = oThis._getBlockConfirmation(transactionBlockNo);

        transactionHashDetails['transactionFee'] = oThis._getTransactionFee(gasUsed, gasPrice);

        // Insert tokenHolders into an array if transfers are present.
        if (transactionHashDetails.transfers) {
          for (let i = 0; i < transactionHashDetails.transfers.length; i++) {
            let transferDetails = transactionHashDetails.transfers[i];

            oThis.tokenHolderAddresses.push(transferDetails.fromAddress);
            oThis.tokenHolderAddresses.push(transferDetails.toAddress);
          }
        }

        // If transaction hash details contains ruleId, Collect that to derive ruleName.
        if (transactionHashDetails.ruleId) {
          oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId] =
            oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId] || [];
          oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId].push(currentTxUuid);
          oThis.ruleIds.push(transactionHashDetails.ruleId);
        }

        oThis.finalTransactionDetails[currentTxUuid] = transactionHashDetails;
      }
    }
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

    logger.log('Block Scanner Instance set.');
  }

  /**
   * If transaction details are not present in pending transactions, fetch from txDetails.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTxDetailsFromBlockScanner() {
    const oThis = this;

    let transactionDetailsData = null,
      getDetailsFromDdbObj = new GetDetailsFromDDB({
        chainId: oThis.chainId,
        transactionHashes: oThis.txTransactionHashes
      }),
      dbResponse = await getDetailsFromDdbObj.perform();

    if (dbResponse.isSuccess()) {
      transactionDetailsData = dbResponse.data;

      logger.log('==== transactionDetailsData ====', transactionDetailsData);
    } else {
      return Promise.reject(dbResponse);
    }

    for (let transactionHash in transactionDetailsData) {
      let transactionHashDetails = transactionDetailsData[transactionHash],
        transactionUuid = transactionHashDetails.transactionUuid,
        transactionBlockNo = transactionHashDetails.blockNumber,
        gasPrice = transactionHashDetails.gasPrice || 0,
        gasUsed = transactionHashDetails.gasUsed || 0,
        totalTransfers = [];

      // Get transaction fee.
      transactionHashDetails['transactionFee'] = oThis._getTransactionFee(gasUsed, gasPrice);

      // Get block confirmation
      transactionHashDetails['blockConfirmation'] = oThis._getBlockConfirmation(transactionBlockNo);

      if (Number(transactionHashDetails.transactionStatus) & Number(transactionHashDetails.transactionInternalStatus)) {
        logger.info('-------- Fetching transfers for transaction ----------', transactionHash);
        let transfersResponse = await oThis._fetchTransfers(transactionHash);

        if (transfersResponse.isSuccess()) {
          let transferResponseData = transfersResponse.data[transactionHash].transfers;
          logger.log('-------- Transfers response ----------', transferResponseData);
          for (let transferIndex in transferResponseData) {
            let transferDetails = transferResponseData[transferIndex];

            oThis.tokenHolderAddresses.push(transferDetails.fromAddress);
            oThis.tokenHolderAddresses.push(transferDetails.toAddress);

            totalTransfers.push(transferDetails);
          }
          transactionHashDetails['transfers'] = totalTransfers;
        }
        transactionHashDetails['status'] = pendingTransaction.successStatus;
      } else {
        transactionHashDetails['status'] = pendingTransaction.failedStatus;
      }

      // If transaction hash details contains ruleId, Collect that to derive ruleName.
      if (transactionHashDetails.ruleId) {
        oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId] =
          oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId] || [];
        oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId].push(transactionUuid);
        oThis.ruleIds.push(transactionHashDetails.ruleId);
      }
      oThis.finalTransactionDetails[transactionUuid] = transactionHashDetails;
    }
  }

  /**
   * Fetch transfers from dynamo.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTransfers(transactionHash, options) {
    const oThis = this,
      GetTransferDetail = oThis.blockScanner.transfer.GetAll,
      getTransferDetailObj = new GetTransferDetail(oThis.chainId, transactionHash, options);

    return await getTransferDetailObj.perform();
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
   * Set userIds and rule names into transaction details
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setUserIdsAndRuleNames() {
    const oThis = this,
      ruleNameResponse = await new RuleNameByRuleId({ ruleIds: oThis.ruleIds }).fetch(),
      rulesData = ruleNameResponse.data || {},
      UserDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserDetailCache'),
      userDetail = await new UserDetailCache({
        tokenHolderAddresses: oThis.tokenHolderAddresses,
        tokenId: oThis.tokenId
      }).fetch();
    let userDetailsData = userDetail.data;

    for (let eachTxUuid in oThis.finalTransactionDetails) {
      let txDetailsForUuid = oThis.finalTransactionDetails[eachTxUuid],
        ruleId = txDetailsForUuid.ruleId,
        ruleName = rulesData[ruleId] && rulesData[ruleId].name,
        transfersArray = [];

      if (txDetailsForUuid.transfers && txDetailsForUuid.transfers.length) {
        for (let i = 0; i < txDetailsForUuid.transfers.length; i++) {
          let transfer = txDetailsForUuid.transfers[i];

          transfersArray.push({
            fromAddress: transfer.fromAddress,
            fromUserId: userDetailsData[transfer.fromAddress].userId,
            toAddress: transfer.toAddress,
            toUserId: userDetailsData[transfer.toAddress].userId,
            amount: transfer.value || transfer.amount // value in pending transactions And amount in case of transfers table.
          });
        }
      }

      oThis.finalTransactionDetails[eachTxUuid]['ruleName'] = ruleName;
      oThis.finalTransactionDetails[eachTxUuid]['transfers'] = transfersArray;
    }

    logger.debug('==== oThis.finalTransactionDetails ====', oThis.finalTransactionDetails);
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
    let val = gasPriceBn.mul(gasUsedBn);
    logger.info('====Val Tx fee===', val.toString(10));
    return val;
  }
}

InstanceComposer.registerAsShadowableClass(GetTransactionDetails, coreConstants.icNameSpace, 'GetTransactionDetails');

module.exports = {};
