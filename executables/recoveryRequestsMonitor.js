/**
 * Module for recovery requests monitoring cron.
 *
 * @module executables/recoveryRequestsMonitor
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  program = require('commander');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/recoveryRequestsMonitor.js --cronProcessId 19');
  logger.log('');
  logger.log('');
});

const cronProcessId = +program.cronProcessId;

if (!cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const chainInstanceComposer = {};
/**
 * Class for recovery requests monitoring cron.
 *
 * @class RecoveryRequestsMonitor
 */
class RecoveryRequestsMonitor extends CronBase {
  /**
   * Constructor for recovery requests monitoring cron.
   *
   * @param {object} params
   * @param {number} params.cronProcessId
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true; // Denotes whether process can exit or not.

    oThis.tokenIds = [];
    oThis.tokenIdMap = {};
  }

  /**
   * Cron kind.
   *
   * @return {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.recoveryRequestsMonitor;
  }

  /**
   * Pending tasks done.
   *
   * @return {boolean}
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Run validations on input parameters.
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitize() {}

  async _start() {
    const oThis = this;

    await oThis._fetchRecoveryOperations();

    if (oThis.tokenIds.length === 0) return;

    await oThis._fetchTokenDetails();

    await oThis._fetchTokenTotalUsers();

    await oThis._sendAlertsIfNeeded();
  }

  /**
   * Fetch active recovery operations.
   *
   * @sets oThis.tokenIds, oThis.tokenIdMap, oThis.tokenIdMap[tokenId].totalOperations
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchRecoveryOperations() {
    const oThis = this;

    const queryKinds = [
      recoveryOperationConstants.invertedKinds[recoveryOperationConstants.initiateRecoveryByUserKind],
      recoveryOperationConstants.invertedKinds[recoveryOperationConstants.pinResetByUserKind]
    ];
    const statusKinds = [
      recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.completedStatus], // TODO: Revert to inProgressStatus
      recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.abortedStatus] // TODO: Revert to waitingForAdminActionStatus
    ];

    const activeRecoveryOperations = await new RecoveryOperationModel()
      .select('token_id, count(*) as totalOperations')
      .where([
        'kind IN (?) AND status IN (?) AND created_at < DATE_SUB(NOW(), INTERVAL (?) SECOND )', // TODO: Revert < to >.
        queryKinds,
        statusKinds,
        recoveryOperationConstants.timeDurationInSeconds
      ])
      .group_by(['token_id'])
      .fire();

    for (let index = 0; index < activeRecoveryOperations.length; index++) {
      const recoveryOperationEntity = activeRecoveryOperations[index];

      oThis.tokenIds.push(recoveryOperationEntity.token_id);
      oThis.tokenIdMap[recoveryOperationEntity.token_id] = {
        totalOperations: 0,
        clientId: 0,
        chainId: 0,
        economyContractAddress: '',
        totalUsers: 0
      };

      oThis.tokenIdMap[recoveryOperationEntity.token_id].totalOperations = recoveryOperationEntity.totalOperations;
    }
  }

  /**
   * Fetch token clientId and auxChainId.
   *
   * @sets oThis.tokenIdMap[tokenId].clientId, oThis.tokenIdMap[tokenId].chainId
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    // Fetch clientIds for all tokens.
    const clientIdsCacheResponsePromisesArray = [];

    for (let index = 0; index < oThis.tokenIds.length; index++) {
      clientIdsCacheResponsePromisesArray.push(new TokenByTokenIdCache({ tokenId: oThis.tokenIds[index] }).fetch());
    }

    const clientIdsCacheResponse = await Promise.all(clientIdsCacheResponsePromisesArray);

    for (let index = 0; index < oThis.tokenIds.length; index++) {
      const tokenId = oThis.tokenIds[index];
      const cacheResponse = clientIdsCacheResponse[index];

      if (cacheResponse.isFailure() || !cacheResponse.data) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_rrm_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: {
              tokenId: tokenId
            }
          })
        );
      }

      oThis.tokenIdMap[tokenId].clientId = cacheResponse.data.clientId;
    }

    // Fetch chainId of client.
    const chainIdsCacheResponsePromisesArray = [];

    for (let index = 0; index < oThis.tokenIds.length; index++) {
      const tokenId = oThis.tokenIds[index];

      chainIdsCacheResponsePromisesArray.push(
        new ClientConfigGroupCache({ clientId: oThis.tokenIdMap[tokenId].clientId }).fetch()
      );
    }

    const chainIdsCacheResponse = await Promise.all(chainIdsCacheResponsePromisesArray);

    for (let index = 0; index < oThis.tokenIds.length; index++) {
      const tokenId = oThis.tokenIds[index];

      const cacheResponse = chainIdsCacheResponse[index];

      if (cacheResponse.isFailure() || !cacheResponse.data) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_rrm_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: {
              tokenId: tokenId
            }
          })
        );
      }

      oThis.tokenIdMap[tokenId].chainId = cacheResponse.data[oThis.tokenIdMap[tokenId].clientId].chainId;
    }
  }

  /**
   * Fetch total users of a token.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenTotalUsers() {
    const oThis = this;

    // Fetch economy contract address for all tokens.
    const economyContractAddressPromisesArray = [];

    for (let index = 0; index < oThis.tokenIds.length; index++) {
      economyContractAddressPromisesArray.push(oThis._fetchEconomyContractAddress(oThis.tokenIds[index]));
    }

    await Promise.all(economyContractAddressPromisesArray);

    const chainIdToTokenIdMap = {};
    const chainIdToEconomyContractAddressMap = {};

    // Create chainIdToTokenIdMap and chainIdToEconomyContractAddressMap.
    for (const tokenId in oThis.tokenIdMap) {
      const tokenEntity = oThis.tokenIdMap[tokenId];

      chainIdToTokenIdMap[tokenEntity.chainId] = chainIdToTokenIdMap[tokenEntity.chainId] || [];
      chainIdToTokenIdMap[tokenEntity.chainId].push(tokenId);

      chainIdToEconomyContractAddressMap[tokenEntity.chainId] =
        chainIdToEconomyContractAddressMap[tokenEntity.chainId] || [];
      chainIdToEconomyContractAddressMap[tokenEntity.chainId].push(tokenEntity.economyContractAddress);
    }

    // Fetch total users of an economy.
    const totalEconomyUsersPromisesArray = [];

    for (const chainId in chainIdToEconomyContractAddressMap) {
      totalEconomyUsersPromisesArray.push(
        oThis._getEconomyDetailsFromDdb(
          chainId,
          chainIdToEconomyContractAddressMap[chainId],
          chainIdToTokenIdMap[chainId]
        )
      );
    }

    await Promise.all(totalEconomyUsersPromisesArray);

    // Subtract company token holder addresses from total users count.
    const companyTokenHolderAddressesPromisesArray = [];

    for (let index = 0; index < oThis.tokenIds.length; index++) {
      companyTokenHolderAddressesPromisesArray.push(oThis._removeCompanyUsersFromTotalUsers(oThis.tokenIds[index]));
    }

    await Promise.all(companyTokenHolderAddressesPromisesArray);
  }

  /**
   * Fetch economy contract address for token id.
   *
   * @param {number/string} tokenId
   *
   * @sets oThis.tokenIdMap[tokenId].economyContractAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchEconomyContractAddress(tokenId) {
    const oThis = this;

    const cacheResponse = await new TokenAddressCache({
      tokenId: tokenId
    }).fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched token address details.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_rrm_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenId: tokenId
          }
        })
      );
    }

    const tokenAddresses = cacheResponse.data;

    oThis.tokenIdMap[tokenId].economyContractAddress =
      tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract];
  }

  /**
   * Get economy details for given economy contract addresses.
   *
   * @param {string/number} auxChainId
   * @param {array<string>} economyContractAddresses
   * @param {array<string>} tokenIds
   *
   * @return {Promise<object>}
   */
  async _getEconomyDetailsFromDdb(auxChainId, economyContractAddresses, tokenIds) {
    const oThis = this;

    const blockScannerObj = await blockScannerProvider.getInstance([auxChainId]),
      EconomyCache = blockScannerObj.cache.Economy,
      economyCache = new EconomyCache({
        chainId: auxChainId,
        economyContractAddresses: economyContractAddresses
      });

    const cacheResponse = await economyCache.fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched economy details from DDB.');

      return Promise.reject(cacheResponse);
    }

    for (let index = 0; index < tokenIds.length; index++) {
      const economyDetails = cacheResponse.data[economyContractAddresses[index]];

      oThis.tokenIdMap[tokenIds[index]].totalUsers = economyDetails.totalTokenHolders;
    }
  }

  /**
   * Get company token holder addresses count.
   *
   * @param {number/string} tokenId
   *
   * @sets oThis.tokenIdMap[tokenId].totalUsers
   *
   * @return {Promise<void>}
   * @private
   */
  async _removeCompanyUsersFromTotalUsers(tokenId) {
    const oThis = this;

    const tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: tokenId }).fetch();

    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data.userUuids
    ) {
      return Promise.reject(new Error('Could not fetch company user UUIDS.'));
    }

    const instanceComposer = await oThis._fetchInstanceComposer(oThis.tokenIdMap[tokenId].chainId);

    const TokenUserDetailsCache = instanceComposer.getShadowedClassFor(
        coreConstants.icNameSpace,
        'TokenUserDetailsCache'
      ),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({
        tokenId: tokenId,
        userIds: tokenCompanyUserCacheRsp.data.userUuids
      }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    const usersData = cacheFetchRsp.data;

    const companyTokenHolderAddresses = [];

    for (const uuid in usersData) {
      const userData = usersData[uuid];
      companyTokenHolderAddresses.push(userData.tokenHolderAddress);
    }

    oThis.tokenIdMap[tokenId].totalUsers -= companyTokenHolderAddresses.length;
  }

  /**
   * Fetch instance composer for the given chainId.
   *
   * @param {string/number} chainId
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchInstanceComposer(chainId) {
    if (chainInstanceComposer[chainId]) {
      return chainInstanceComposer[chainId];
    }

    const configStrategyHelper = new ConfigStrategyHelper(chainId);
    const configResponse = await configStrategyHelper.getComplete();
    const configStrategy = configResponse.data;

    chainInstanceComposer[chainId] = new InstanceComposer(configStrategy);

    return chainInstanceComposer[chainId];
  }

  /**
   * Send pager duty alerts to dev team if needed.
   *
   * @return {Promise<void>}
   * @private
   */
  async _sendAlertsIfNeeded() {
    const oThis = this;

    const promisesArray = [];

    oThis.canExit = false;

    for (const tokenId in oThis.tokenIdMap) {
      const tokenTotalUsers = oThis.tokenIdMap[tokenId].totalUsers;

      const userBatchCount = Math.ceil(tokenTotalUsers / recoveryOperationConstants.recoveryRequestUserBatchSize);

      if (
        userBatchCount * recoveryOperationConstants.requestsThresholdAllowedPerUserBatch <
        oThis.tokenIdMap[tokenId].totalOperations
      ) {
        logger.error('e_rrm_4', 'Recovery requests for client greater than threshold.');
        const errorObject = responseHelper.error({
          internal_error_identifier: 'recovery_requests_threshold_exceeded:e_rrm_4',
          api_error_identifier: 'recovery_requests_threshold_exceeded',
          debug_options: {
            tokenId: tokenId,
            totalRecoveryOperations: oThis.tokenIdMap[tokenId].totalOperations,
            threshold: userBatchCount * recoveryOperationConstants.requestsThresholdAllowedPerUserBatch
          }
        });
        promisesArray.push(createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity));
      }
    }

    await Promise.all(promisesArray);

    oThis.canExit = true;
  }
}

// Perform action.
new RecoveryRequestsMonitor({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
