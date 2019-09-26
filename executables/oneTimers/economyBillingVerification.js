const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const program = require('commander');

const rootPrefix = '../../',
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  TokenByClientIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  ConfigStrategyByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');

program.option('--clientId <clientId>', 'Client ID of economy.').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/oneTimers/economyBillingVerification.js --clientId 10267');
  logger.log('');
  logger.log('');
});

if (!program.clientId) {
  program.help();
  process.exit(1);
}

// Declare query related variables.
const startDate = new Date('2019, 06, 27'),
  endDate = new Date('2019, 07, 01'),
  queryLimit = 100;

/**
 * Class to verify transaction amount and count for economies.
 *
 * @class EconomyBillingVerification
 */
class EconomyBillingVerification {
  /**
   * Constructor to verify transaction amount and count for economies.
   *
   * @param {object} params
   * @param {string/number} params.clientId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.clientId = params.clientId;

    oThis.blockScannerObj = null;
    oThis.totalVolume = null;
    oThis.ic = null;
    oThis.sessionAddresses = [];
    oThis.totalTransactions = 0;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform();
  }

  /**
   * Async perform.
   *
   * @sets oThis.totalVolume, oThis.blockScannerObj
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    oThis.totalVolume = basicHelper.convertToBigNumber(0);

    let promiseArray = [oThis._fetchTokenDetails(), oThis._fetchClientConfigStrategy()];
    await Promise.all(promiseArray);

    oThis.blockScannerObj = await blockScannerProvider.getInstance([oThis.auxChainId]);

    promiseArray = [oThis.fetchConfigStrategy(), oThis.fetchTokenCompanyUserDetails()];
    await Promise.all(promiseArray);

    await oThis.fetchCompanySessionAddress();

    await oThis.getTransactionHashes();

    logger.info('Total transactions: ', oThis.totalTransactions);
    logger.info('Total Volume in OST: ', oThis.totalVolume.toString(10));

    return responseHelper.successWithData({
      totalTransactions: oThis.totalTransactions,
      ostValue: oThis.totalVolume.toString(10)
    });
  }

  /**
   * Fetch token details from cache.
   *
   * @sets oThis.token
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    const tokenCache = new TokenByClientIdCache({
      clientId: oThis.clientId
    });

    const response = await tokenCache.fetch();
    if (!response.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_b_2',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    oThis.token = response.data;
  }

  /**
   * Fetch client config strategy.
   *
   * @sets oThis.auxChainId
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchClientConfigStrategy() {
    const oThis = this;

    // Fetch client config group.
    const clientConfigStrategyCacheObj = new ClientConfigGroupCache({ clientId: oThis.clientId }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    if (fetchCacheRsp.isFailure()) {
      return Promise.reject(fetchCacheRsp);
    }

    oThis.auxChainId = fetchCacheRsp.data[oThis.clientId].chainId;
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

    const configStrategy = (await new ConfigStrategyByChainId(oThis.auxChainId).getComplete()).data;
    oThis.ic = new InstanceComposer(configStrategy);
  }

  /**
   * Fetch token company user details.
   *
   * @sets oThis.companyUUUID
   *
   * @returns {Promise<never>}
   */
  async fetchTokenCompanyUserDetails() {
    const oThis = this;

    const tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.token.id }).fetch();
    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data.userUuids
    ) {
      return Promise.reject(tokenCompanyUserCacheRsp);
    }

    oThis.companyUUUID = tokenCompanyUserCacheRsp.data.userUuids[0];
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
        userId: oThis.companyUUUID,
        tokenId: oThis.token.id
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
        oThis.token.id,
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
        await oThis._fetchTransactionDetails(transactionHashes);
      }
      page++;
    }
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
    const getTransactionDetails = new GetTransactionDetails(oThis.auxChainId, transactionHashes);

    const promiseArray = [getTransactionDetails.perform(), oThis.getTransferDetails(transactionHashes)];
    const promiseArrayResponse = await Promise.all(promiseArray);

    const transactionGetResponse = promiseArrayResponse[0];
    const transactionTransfersMap = promiseArrayResponse[1];

    const transactionDetails = transactionGetResponse.data;

    let batchTotalVolume = basicHelper.convertToBigNumber(0);

    for (let ind = 0; ind < transactionHashes.length; ind++) {
      const transactionHash = transactionHashes[ind];

      if (transactionDetails[transactionHash] && transactionDetails[transactionHash].transactionStatus === '1') {
        oThis.totalTransactions += 1;
      }

      const transferEventsMap = transactionTransfersMap[transactionHash];
      let transactionHashTotalAmount = basicHelper.convertToBigNumber(0);
      for (const eventIndex in transferEventsMap) {
        const transferEvent = transferEventsMap[eventIndex],
          currentAmount = basicHelper.convertToBigNumber(transferEvent.amount);

        transactionHashTotalAmount = transactionHashTotalAmount.add(currentAmount);
      }

      batchTotalVolume = batchTotalVolume.add(transactionHashTotalAmount);
    }

    const totalVolume = basicHelper
      .convertLowerUnitToNormal(batchTotalVolume, 18)
      .div(basicHelper.convertToBigNumber(oThis.token.conversionFactor))
      .toFixed(5);

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
      getTransfer = new GetTransfer(oThis.auxChainId, transactionHashes),
      getTransferResp = await getTransfer.perform();

    if (getTransferResp.isFailure()) {
      return Promise.reject(getTransferResp);
    }

    return getTransferResp.data;
  }
}

// Perform action.
new EconomyBillingVerification({ clientId: program.clientId })
  .perform()
  .then(function() {
    process.exit(0);
  })
  .catch(function() {
    process.exit(1);
  });
