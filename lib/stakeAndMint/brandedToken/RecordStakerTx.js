/**
 * Module to record staker transaction in database.
 *
 * @module lib/stakeAndMint/brandedToken/RecordStakerTx
 */

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to record staker transaction in database.
 *
 * @class RecordStakerTx
 */
class RecordStakerTx extends StakeAndMintBase {
  /**
   * Constructor to record staker transaction in database.
   *
   * @param {object} params
   * @param {number} params.clientId
   * @param {number} params.tokenId
   * @param {string} params.transactionHash
   * @param {string} params.pendingTransactionKind
   * @param {number} params.originChainId
   * @param {string} params.stakerAddress
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.tokenId = params.tokenId;
    oThis.transactionHash = params.transactionHash;
    oThis.pendingTransactionKind = params.pendingTransactionKind;
    oThis.originChainId = params.originChainId;
    oThis.stakerAddress = params.stakerAddress;
  }

  /**
   * Async perform.
   *
   * @private
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    const isTrxFinalized = await oThis._checkTransactionFinalized();

    // If transaction is already finalized by our block Scanner, then mark step as done and move ahead.
    let taskStatus;

    if (isTrxFinalized) {
      taskStatus = workflowStepConstants.taskDone;
    } else {
      taskStatus = workflowStepConstants.taskPending;
      await oThis._insertPendingTransaction();
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
   * Check if transaction is finalized or not.
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _checkTransactionFinalized() {
    const oThis = this;

    let isTrxFinalized = false;

    const txReceipt = await oThis.originWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    // Transaction is already mined.
    if (txReceipt) {
      const txBlock = txReceipt.blockNumber,
        finalizedBlock = await oThis._getLastFinalizedBlock();

      isTrxFinalized = txBlock <= finalizedBlock;
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
   * Fetch gateway addresses.
   *
   * @return {Promise<string>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    return addressesResp.data[tokenAddressConstants.tokenGatewayContract];
  }

  /**
   * Fetch stake currency contract address.
   *
   * @return {Promise<string>}
   * @private
   */
  async _fetchStakeCurrencyContractAddress() {
    const oThis = this;

    const tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    const response = await tokenCache.fetch();
    if (response.isFailure()) {
      return Promise.reject(response);
    }

    const stakeCurrencyId = response.data.stakeCurrencyId;

    const stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({
      stakeCurrencyIds: [stakeCurrencyId]
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    return stakeCurrencyCacheResponse.data[stakeCurrencyId].contractAddress;
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

    let toAddress = null;

    // In the scenario where transaction is not found on GETH, GETH might be running behind.
    if (!txOptions) {
      if (oThis.pendingTransactionKind === pendingTransactionConstants.approveGatewayComposerKind) {
        toAddress = await oThis._fetchStakeCurrencyContractAddress();
      } else {
        toAddress = await oThis._fetchGatewayAddresses();
      }

      txOptions = {
        from: oThis.stakerAddress,
        to: toAddress,
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
}

module.exports = RecordStakerTx;
