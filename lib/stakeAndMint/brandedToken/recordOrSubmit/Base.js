'use strict';

/*
 * This file helps in handling transaction provided by FE or submitting them if token has OST managed owner
 */

const rootPrefix = '../../../..',
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

class RecordOrSubmitBase extends StakeAndMintBase {
  /**
   *
   * @param params
   * @param params.clientId {Number} - client id
   * @param params.tokenId {Number} - token id
   * @param params.originChainId (Number) - origin chain id
   * @param params.stakerAddress {String} - staker address
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.tokenId = params.tokenId;
    oThis.originChainId = params.originChainId;
    oThis.stakerAddress = params.stakerAddress;

    oThis.transactionHash = null;
    oThis.originShuffledProviders = null;
    oThis.toAddress = null;
    oThis.pendingTransactionKind = null;
    oThis.originWeb3 = null;
    oThis.originChainGasPrice = null;
  }

  /***
   * Async perform
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    let taskStatus;

    if (oThis.transactionHash) {
      let isTrxFinalized = await oThis._checkTransactionFinalized();

      // If transaction is already finalized by our block Scanner
      // Then mark step as done and move ahead.
      if (isTrxFinalized) {
        taskStatus = workflowStepConstants.taskDone;
      } else {
        taskStatus = workflowStepConstants.taskPending;
        await oThis._insertPendingTransaction();
      }
    } else {
      taskStatus = workflowStepConstants.taskPending;

      await oThis._fetchDataRequiredToSubmitTransaction();

      let response = await oThis._submitTransaction();

      if (response.isFailure()) {
        return Promise.resolve(
          responseHelper.successWithData({
            taskStatus: workflowStepConstants.taskFailed,
            debugParams: { response: response.toHash() }
          })
        );
      }

      oThis.transactionHash = response.data.transactionHash;
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: taskStatus,
        transactionHash: oThis.transactionHash,
        taskResponseData: { chainId: oThis.originChainId, transactionHash: oThis.transactionHash }
      })
    );
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    let originChainConfig = response[oThis.originChainId];

    oThis.originShuffledProviders = basicHelper.shuffleArray(originChainConfig.originGeth.readWrite.wsProviders);

    oThis.originWeb3 = web3Provider.getInstance(oThis.originShuffledProviders[0]).web3WsProvider;
  }

  /**
   * check is transaction is finalized
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _checkTransactionFinalized() {
    const oThis = this;

    let isTrxFinalized = false,
      txReceipt = await oThis.originWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    // Transaction is already mined.
    if (txReceipt) {
      let txBlock = txReceipt.blockNumber,
        finalizedBlock = await oThis._getLastFinalizedBlock();

      isTrxFinalized = txBlock <= finalizedBlock;
    }

    return isTrxFinalized;
  }

  /**
   * get last finalized block
   *
   * @return {Promise<number>}
   * @private
   */
  async _getLastFinalizedBlock() {
    const oThis = this;

    let blockScannerObj = await blockScannerProvider.getInstance([oThis.originChainId]),
      ChainCronDataModel = blockScannerObj.model.ChainCronData,
      chainCronDataObj = new ChainCronDataModel({}),
      cronDataRsp = await chainCronDataObj.getCronData(oThis.originChainId);

    return parseInt(cronDataRsp[oThis.originChainId]['lastFinalizedBlock']);
  }

  /**
   * _insertPendingTransaction
   *
   * @private
   */
  async _insertPendingTransaction() {
    const oThis = this;

    let txOptions = await oThis.originWeb3.eth.getTransaction(oThis.transactionHash);

    // In the scenario where Transaction is not found on GETH. GETH might be running behind.
    if (!txOptions) {
      await oThis._setToAddress();

      txOptions = {
        from: oThis.stakerAddress,
        to: oThis.toAddress,
        gas: '0',
        gasPrice: '0'
      };
    }

    let createPendingTransaction = new PendingTransactionCrud(oThis.originChainId);

    return createPendingTransaction.create({
      transactionData: txOptions,
      transactionHash: oThis.transactionHash,
      afterReceipt: oThis.payloadDetails,
      tokenId: oThis.tokenId,
      kind: oThis.pendingTransactionKind
    });
  }

  /**
   * Get origin chain dynamic gas price.
   *
   * @return {Promise<*>}
   * @private
   */
  async _setOriginChainGasPrice() {
    const oThis = this;
    const dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();
    oThis.originChainGasPrice = dynamicGasPriceResponse.data;
  }

  /**
   *
   * Set to address
   *
   * @private
   */
  async _setToAddress() {
    throw 'sub class to implement this and set oThis.toAddress';
  }

  /**
   *
   * fetch all data points needed to submit tx
   *
   * @private
   */
  async _fetchDataRequiredToSubmitTransaction() {
    throw 'sub class to implement this to fetch all data points needed to submit tx';
  }

  /**
   *
   * submit tx to geth
   *
   * @private
   */
  async _submitTransaction() {
    throw 'sub class to implement this and set oThis.transactionHash';
  }
}

module.exports = RecordOrSubmitBase;
