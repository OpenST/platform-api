// chainId, txHashes

//1. query ES to check status of  txHashes
//2. if fails
// a. query pending tx by given method
// b. for txHashes not found in pending (as they get deleted)
//    i. then fetch TxDetails  block-scanner
//    ii. for tx which are success (status & internalStatus) fetch transfers

// 3. fetch rule details by id

// 4. if any of txHash was mined, fetch highestFinalized block from block-scanners

// 5. in blockNo present in txData / pendingData (edge case) and blockNo < highestFinalized set finalized = true else false

// 4. assuming data found formatter takes either
// a. pendingTxData
// b. txData & transferData

'use strict';

/**
 * Get transaction details.
 *
 * @module lib/transactions/GetTransactionDetails
 */

const BigNumber = require('bignumber.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
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
   *
   */
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.esSearchData = params.esSearchData;

    oThis.txTransactionHashes = [];
    oThis.pendingTransactionUuids = [];
    oThis.missingTxUuids = [];
    oThis.blockScanner = null;
    oThis.finalTransactionDetails = {};
    oThis.highestFinalizedBlock = null;
    oThis.ruleIdToTxUuidMap = {};
    oThis.ruleIds = [];
    oThis.tokenHolderAddresses = [];
    oThis.tokenId = null;
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._setBlockScannerInstance();

    await oThis._getHighestFinalizedBlock();

    await oThis._checkTxHashStatus();

    if (oThis.pendingTransactionUuids.length) {
      await oThis._getPendingTx();
    } else if (oThis.txTransactionHashes.length) {
      await oThis._fetchTxDetailsFromBlockScanner(); // Merge missing transactionHashes here.
    }

    await oThis._setUserIdsAndRuleNames();

    logger.info('======oThis.finalTransactionDetails===2222222', oThis.finalTransactionDetails);

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
    console.log('transactionsFromEs', transactionsFromEs);

    // Here, one user Id will always have same token id. So Used first element.
    oThis.tokenId = transactionsFromEs[0].token_id;

    for (let index = 0; index < transactionsFromEs.length; index++) {
      let currentTransaction = transactionsFromEs[index];

      if (
        currentTransaction.status === invertedCreatedStatus ||
        currentTransaction.status === invertedSubmittedStatus ||
        currentTransaction.status === invertedMinedStatus
      ) {
        oThis.pendingTransactionUuids.push(currentTransaction.id);
        logger.debug('===== oThis.pendingTransactionUuids ======', oThis.pendingTransactionUuids);
      } else {
        oThis.txTransactionHashes.push(currentTransaction.transaction_hash);
        logger.debug('===== oThis.txTransactionHashes ======', oThis.txTransactionHashes);
      }
    }
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
          transactionBlockNo = transactionHashDetails['blockNumber'],
          gasPrice = transactionHashDetails['gasPrice'],
          gasUsed = transactionHashDetails['gasUsed'] || 5000;

        // Insert transactionUuid.
        transactionHashDetails['transactionUuid'] = currentTxUuid;

        // Get block confirmation
        transactionHashDetails['blockConfirmation'] = oThis.highestFinalizedBlock - transactionBlockNo;

        transactionHashDetails['transactionFee'] = oThis._getTransactionFee(gasUsed, gasPrice); // TODO

        logger.info("============transactionHashDetails['transactionFee']", transactionHashDetails['transactionFee']);

        // Insert tokenHolders into an array if transfers are present.
        if (transactionHashDetails.transfers) {
          for (let i = 0; i < transactionHashDetails.transfers.length; i++) {
            let transferDetails = transactionHashDetails.transfers[i];

            oThis.tokenHolderAddresses.push(transferDetails['fromAddress']);
            oThis.tokenHolderAddresses.push(transferDetails['toAddress']);
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

    logger.debug('====== oThis.finalTransactionDetails ======4444444', oThis.finalTransactionDetails);
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
    } else {
      return Promise.reject(dbResponse);
    }

    for (let transactionHash in transactionDetailsData) {
      let transactionHashDetails = transactionDetailsData[transactionHash],
        transactionUuid = transactionHashDetails['transactionUuid'],
        transactionBlockNo = transactionHashDetails['blockNumber'],
        blockConfirmation = oThis.highestFinalizedBlock - transactionBlockNo;

      oThis.finalTransactionDetails[transactionUuid] = transactionHashDetails;
      oThis.finalTransactionDetails[transactionUuid]['blockConfirmation'] = blockConfirmation;

      if (
        Number(transactionHashDetails.transactionStatus) &&
        Number(transactionHashDetails.transactionInternalStatus) &&
        transactionHashDetails.totalTokenTransfers > 0
      ) {
        let transfersResponse = await oThis._fetchTransfers(transactionHash); //options are remaining.

        if (transfersResponse.isSuccess()) {
          let transferResponseData = transfersResponse.data;

          for (let i = 0; i < transferResponseData.length; i++) {
            let transferDetails = transferResponseData[i];

            oThis.tokenHolderAddresses.push(transferDetails['fromAddress']);
            oThis.tokenHolderAddresses.push(transferDetails['toAddress']);
          }
          oThis.finalTransactionDetails[transactionUuid]['transfers'] = transferResponseData;
        }
      }

      // If transaction hash details contains ruleId, Collect that to derive ruleName.
      if (transactionHashDetails.ruleId) {
        oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId] =
          oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId] || [];
        oThis.ruleIdToTxUuidMap[transactionHashDetails.ruleId].push(transactionUuid);
        oThis.ruleIds.push(transactionHashDetails.ruleId);
      }
    }
    logger.debug('===== oThis.finalTransactionDetails =====555555', oThis.finalTransactionDetails);
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
   * Get highest finalized block from blockScanner.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getHighestFinalizedBlock() {
    const oThis = this,
      chainCronDataModel = oThis.blockScanner.model.ChainCronData,
      chainCronDataModelObj = new chainCronDataModel({}),
      chainCronDataResp = await chainCronDataModelObj.getCronData(oThis.chainId);

    oThis.highestFinalizedBlock = chainCronDataResp[oThis.chainId].lastFinalizedBlock;
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

    logger.debug('==== userDetailsData ====', userDetailsData);
    logger.debug('==== oThis.tokenHolderAddresses ====', oThis.tokenHolderAddresses);

    for (let eachTxUuid in oThis.finalTransactionDetails) {
      let txDetailsForUuid = oThis.finalTransactionDetails[eachTxUuid],
        ruleId = txDetailsForUuid['ruleId'],
        ruleName = rulesData[ruleId] || '',
        transfersArray = [];

      if (txDetailsForUuid['transfers'] && txDetailsForUuid['transfers'].length) {
        for (let i = 0; i < txDetailsForUuid['transfers'].length; i++) {
          let transfer = txDetailsForUuid['transfers'][i];
          console.log('transfer', transfer);
          transfersArray.push({
            fromAddress: transfer.fromAddress,
            fromUserId: userDetailsData[transfer.fromAddress]['userId'],
            toAddress: transfer.toAddress,
            toUserId: userDetailsData[transfer.toAddress]['userId'],
            amount: transfer.value
            //kind: '' //TODO: ???
          });
        }
      }

      oThis.finalTransactionDetails[eachTxUuid]['ruleName'] = ruleName;
      oThis.finalTransactionDetails[eachTxUuid]['transfers'] = transfersArray;
    }

    logger.debug('======  oThis.finalTransactionDetails =====11111', oThis.finalTransactionDetails);
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
