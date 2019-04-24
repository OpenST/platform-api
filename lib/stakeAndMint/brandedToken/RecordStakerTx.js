'use strict';

/*
 * This file helps in handling transaction provided by FE
 */

const rootPrefix = '../../..',
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById');

class RecordStakerTx extends StakeAndMintBase {
  /**
   *
   * @param params
   * @param params.clientId {Number} - client id
   * @param params.tokenId {Number} - token id
   * @param params.transactionHash {String} - auxiliary chain id
   * @param params.pendingTransactionKind {String} - pending tx kind
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
    oThis.transactionHash = params.transactionHash;
    oThis.pendingTransactionKind = params.pendingTransactionKind;
    oThis.originChainId = params.originChainId;
    oThis.stakerAddress = params.stakerAddress;
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

    let isTrxFinalized = await oThis._checkTransactionFinalized();

    // If transaction is already finalized by our block Scanner
    // Then mark step as done and move ahead.
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
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];

    let shuffledProviders = basicHelper.shuffleArray(oThis.originChainConfig.originGeth.readWrite.wsProviders);

    oThis.originWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
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
   * Fetch gateway addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    return addressesResp.data[tokenAddressConstants.tokenGatewayContract];
  }

  /**
   * Fetch token details
   *
   * @private
   */
  async _fetchStakeCurrencyContractAddress() {
    const oThis = this;

    let tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    let response = await tokenCache.fetch();
    if (response.isFailure()) {
      return Promise.reject(response);
    }

    let stakeCurrencyId = response.data.stakeCurrencyId;

    let stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({ stakeCurrencyIds: [stakeCurrencyId] }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    return stakeCurrencyCacheResponse.data[stakeCurrencyId]['contractAddress'];
  }

  /**
   * _insertPendingTransaction
   *
   * @private
   */
  async _insertPendingTransaction() {
    const oThis = this;

    let txOptions = await oThis.originWeb3.eth.getTransaction(oThis.transactionHash);

    let toAddress = null;

    // In the scenario where Transaction is not found on GETH. GETH might be running behind.
    if (!txOptions) {
      if (oThis.pendingTransactionKind == pendingTransactionConstants.approveGatewayComposerKind) {
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

    let createPendingTransaction = new PendingTransactionCrud(oThis.originChainId);

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
