const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../',
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  ConfigStrategyByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId.js'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');

// Declare economy related variables.
const tokenId = '1185',
  companyUUUID = '0d91bb6f-7301-4bb8-8cf0-655e16de4f84',
  chainId = '197',
  conversionFactor = 10;

// Declare query related variables.
const startDate = new Date('2019, 06, 01'),
  endDate = new Date('2019, 07, 01'),
  queryLimit = 10;

let totalTransactions = 0,
  totalVolume = 0;

/**
 * Class to verify transaction amount and count for economies.
 *
 * @class HornetVerification
 */
class HornetVerification {
  constructor() {
    const oThis = this;

    oThis.blockScannerObj = null;
    oThis.totalVolume = null;
    oThis.ic = null;
    oThis.sessionAddresses = [];
  }

  perform() {
    const oThis = this;

    return oThis.asyncPerform();
  }

  /**
   * Async perform.
   *
   * @sets oThis.blockScannerObj, oThis.totalVolume
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    oThis.blockScannerObj = await blockScannerProvider.getInstance([chainId]);
    oThis.totalVolume = basicHelper.convertToBigNumber(0);

    await oThis.fetchConfigStrategy();

    await oThis.fetchCompanySessionAddress();

    await oThis.getTransactionHashes();
  }

  /**
   * Fetch config strategy.
   *
   * @sets oThis.ic
   *
   * @returns {Promise<void>}
   */
  async fetchConfigStrategy() {
    const oThis = this;

    const configStrategy = (await new ConfigStrategyByChainId(chainId).getComplete()).data;
    oThis.ic = new InstanceComposer(configStrategy);
  }

  /**
   * Fetch company session addresses.
   *
   * @sets oThis.sessionAddresses
   *
   * @returns {Promise<never>}
   */
  async fetchCompanySessionAddress() {
    const oThis = this;

    const UserSessionAddressCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCache = new UserSessionAddressCache({
        userId: companyUUUID,
        tokenId: tokenId
      }),
      userSessionAddressCacheResp = await userSessionAddressCache.fetch();
    if (userSessionAddressCacheResp.isFailure() || !userSessionAddressCacheResp.data) {
      return Promise.reject(userSessionAddressCacheResp);
    }

    oThis.sessionAddresses = userSessionAddressCacheResp.data.addresses;
  }

  /**
   * Get transaction information in batches.
   *
   * @returns {Promise<void>}
   */
  async getTransactionHashes() {
    const oThis = this;

    let page = 1,
      offset = null,
      moreDataPresent = true;

    while (moreDataPresent) {
      offset = (page - 1) * queryLimit;

      const whereClause = [
        'token_id = ? AND status = ? AND receipt_status = ? AND session_address NOT IN (?) AND created_at >= ? AND created_at < ?',
        tokenId,
        6,
        1,
        oThis.sessionAddresses,
        startDate,
        endDate
      ];

      const dbRows = await new TransactionMetaModel()
        .select('transaction_hash')
        .where(whereClause)
        .limit(queryLimit)
        .offset(offset)
        .fire();

      if (dbRows.length === 0) {
        moreDataPresent = false;
      } else {
        const transactionHashes = [];
        for (let index = 0; index < dbRows.length; index++) {
          transactionHashes.push(dbRows[index].transaction_hash);
        }
        logger.log('transactionHashes---', transactionHashes);
        await oThis._fetchTransactionDetails(transactionHashes);
        logger.log('====oThis.totalVolume=====11111========', oThis.totalVolume.toString(10));
        moreDataPresent = false;
      }
      page++;
    }

    logger.log('totalTransactions--------', totalTransactions);
    logger.log('====oThis.totalVolume=====2222222========', oThis.totalVolume.toString(10));
  }

  /**
   * Fetch transaction details.
   *
   * @param {array<string>} transactionHashes
   *
   * @sets oThis.totalVolume
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTransactionDetails(transactionHashes) {
    const oThis = this;

    const GetTransactionDetails = oThis.blockScannerObj.transaction.Get;
    const getTransactionDetails = new GetTransactionDetails(chainId, transactionHashes);

    const promiseArray = [getTransactionDetails.perform(), oThis.getTransferDetails(transactionHashes)];
    const promiseArrayResponse = await Promise.all(promiseArray);

    const transactionGetResponse = promiseArrayResponse[0];
    const transactionTransfersMap = promiseArrayResponse[1];

    const transactionDetails = transactionGetResponse.data;

    let batchTotalVolume = basicHelper.convertToBigNumber(0);

    for (let ind = 0; ind < transactionHashes.length; ind++) {
      const transactionHash = transactionHashes[ind];

      if (transactionDetails[transactionHash] && transactionDetails[transactionHash].transactionStatus === '1') {
        totalTransactions += 1;
      }

      const transferEventsMap = transactionTransfersMap[transactionHash];
      let transactionHashTotalAmount = basicHelper.convertToBigNumber(0);
      for (const eventIndex in transferEventsMap) {
        const transferEvent = transferEventsMap[eventIndex],
          currentAmount = basicHelper.convertToBigNumber(transferEvent.amount);
        logger.log('===currentAmount========', currentAmount.toString(10));
        transactionHashTotalAmount = transactionHashTotalAmount.add(currentAmount);
        logger.log('===transactionHashTotalAmount======111111==', transactionHashTotalAmount.toString(10));
      }

      logger.log('===transactionHashTotalAmount=====22222222===', transactionHashTotalAmount.toString(10));

      batchTotalVolume = batchTotalVolume.add(transactionHashTotalAmount);

      logger.log('===batchTotalVolume=====1111111===', transactionHashTotalAmount.toString(10));
    }

    logger.log('===batchTotalVolume=====22222222===', batchTotalVolume.toString(10));

    totalVolume = basicHelper
      .convertLowerUnitToNormal(batchTotalVolume, 18)
      .div(basicHelper.convertToBigNumber(conversionFactor))
      .toFixed(5);

    logger.log('===totalVolume========', totalVolume.toString(10));

    oThis.totalVolume = oThis.totalVolume.add(totalVolume);
  }

  /**
   * Get transfer details for transaction hashes.
   *
   * @param {array<string>} transactionHashes
   * @returns {Promise<*>}
   */
  async getTransferDetails(transactionHashes) {
    const oThis = this;

    const GetTransfer = oThis.blockScannerObj.transfer.GetAll,
      getTransfer = new GetTransfer(chainId, transactionHashes),
      getTransferResp = await getTransfer.perform();

    if (getTransferResp.isFailure()) {
      return Promise.reject(getTransferResp);
    }

    return getTransferResp.data;
  }
}

module.exports = HornetVerification;
