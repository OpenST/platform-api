/**
 * Module to help in handling transaction provided by FE or submitting them if token has OST managed owner.
 *
 * @module lib/stakeAndMint/brandedToken/recordOrSubmit/Base
 */

const rootPrefix = '../../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to help in handling transaction provided by FE or submitting them if token has OST managed owner.
 *
 * @class RecordOrSubmitBase
 */
class RecordOrSubmitBase extends StakeAndMintBase {
  /**
   * Constructor to help in handling transaction provided by FE or submitting them if token has OST managed owner.
   *
   * @param {object} params
   * @param {number} params.clientId: client id
   * @param {number} params.tokenId: token id
   * @param {number} params.originChainId: origin chain id
   * @param {string} params.stakerAddress: staker address
   *
   * @augments StakeAndMintBase
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

  /**
   * Async perform.
   *
   * @sets oThis.transactionHash
   *
   * @return {Promise<result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    let taskStatus;

    if (oThis.transactionHash) {
      const isTrxFinalized = await oThis._checkTransactionFinalized();

      // If transaction is already finalized by our block Scanner, then mark step as done and move ahead.
      if (isTrxFinalized) {
        taskStatus = workflowStepConstants.taskDone;
      } else {
        taskStatus = workflowStepConstants.taskPending;
        await oThis._insertPendingTransaction();
      }
    } else {
      taskStatus = workflowStepConstants.taskPending;

      await oThis._fetchDataRequiredToSubmitTransaction();

      const response = await oThis._submitTransaction();

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
   * Set origin web3 instance.
   *
   * @sets oThis.originShuffledProviders, oThis.originWeb3
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.originChainId]);

    const originChainConfig = response[oThis.originChainId];

    oThis.originShuffledProviders = basicHelper.shuffleArray(originChainConfig.originGeth.readWrite.wsProviders);
    oThis.originWeb3 = web3Provider.getInstance(oThis.originShuffledProviders[0]).web3WsProvider;
  }

  /**
   * Check is transaction is finalized.
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _checkTransactionFinalized() {
    const oThis = this;

    const txReceipt = await oThis.originWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    let isTrxFinalized = false;

    // Transaction is already mined.
    if (txReceipt) {
      const txBlock = txReceipt.blockNumber,
        finalizedBlock = await oThis._getLastFinalizedBlock();

      // we are relaxing the block delay by 1 here
      // ie for a 24 block delay, we would consider this tx as  finalized after 23 blocks of getting mined
      // this is a short term fix to handle parallel sync processing of two record txs (approve / request_stake)
      isTrxFinalized = txBlock <= finalizedBlock + 1;
    }

    return isTrxFinalized;
  }

  /**
   * Get last finalized block.
   *
   * @return {Promise<number>}
   * @private
   */
  async _getLastFinalizedBlock() {
    const oThis = this;

    const blockScannerObj = await blockScannerProvider.getInstance([oThis.originChainId]),
      ChainCronDataModel = blockScannerObj.model.ChainCronData,
      chainCronDataObj = new ChainCronDataModel({}),
      cronDataRsp = await chainCronDataObj.getCronData(oThis.originChainId);

    return parseInt(cronDataRsp[oThis.originChainId].lastFinalizedBlock);
  }

  /**
   * Insert transaction in pending transactions table.
   *
   * @return {Promise<*>}
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

    const createPendingTransaction = new PendingTransactionCrud(oThis.originChainId);

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
   * @sets oThis.originChainGasPrice
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
   * Set to address.
   *
   * @return {Promise<void>}
   * @private
   */
  async _setToAddress() {
    throw new Error('Sub-class to implement this and set oThis.toAddress.');
  }

  /**
   * Fetch all data points needed to submit tx.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchDataRequiredToSubmitTransaction() {
    throw new Error('Sub-class to implement this to fetch all data points needed to submit tx.');
  }

  /**
   * Submit tx to geth.
   *
   * @return {Promise<void>}
   * @private
   */
  async _submitTransaction() {
    throw new Error('Sub-class to implement this and set oThis.transactionHash.');
  }
}

module.exports = RecordOrSubmitBase;
