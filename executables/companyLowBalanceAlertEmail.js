const program = require('commander'),
  BigNumber = require('bignumber.js');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  GetUbtBalance = require(rootPrefix + '/lib/getBalance/Ubt'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ClientConfigGroupModel = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  SendTransactionalMail = require(rootPrefix + '/lib/email/hookCreator/SendTransactionalMail'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  pepoCampaignsConstants = require(rootPrefix + '/lib/globalConstant/pepoCampaigns'),
  environmentConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/balanceVerifier.js --cronProcessId 76');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare constants.
const batchSize = 100;

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class to send company low balance alert emails.
 *
 * @class CompanyLowBalanceAlertEmail
 */
class CompanyLowBalanceAlertEmail extends CronBase {
  /**
   * Constructor to send company low balance alert emails.
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

    oThis.clientIds = [];
    oThis.ic = {};
    oThis.EconomyCache = {};
  }

  /**
   * Cron kind.
   *
   * @return {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.companyLowBalanceAlertEmail;
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
   * @sets oThis.tokenIdMap, oThis.economyContractAddresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitize() {
    // Do nothing.
  }

  /**
   * Start the cron processing.
   *
   * @sets oThis.EconomyCache
   *
   * @returns {Promise<void>}
   * @private
   */
  async _start() {
    const oThis = this;
    oThis.canExit = false;

    await Promise.all([oThis._fetchClientIdsForChainAndGroup(), oThis._setIc()]);

    const blockScannerObj = await blockScannerProvider.getInstance([oThis.auxChainId]);
    oThis.EconomyCache = blockScannerObj.cache.Economy;

    for (let index = 0; index < oThis.clientIds.length; index += batchSize) {
      oThis.tokenIdMap = {};
      oThis.economyContractAddresses = [];

      let clientIdsBatch = oThis.clientIds.slice(index, index + batchSize);

      clientIdsBatch = await oThis._checkClientStakeAndMintStatus(clientIdsBatch);

      const tokenIdsResponse = await oThis._fetchTokenIds(clientIdsBatch);
      const tokenIds = tokenIdsResponse.tokenIds;
      clientIdsBatch = tokenIdsResponse.clientIds;

      await oThis._fetchTokenAddresses(tokenIds);

      if (oThis.economyContractAddresses.length > 0) {
        await Promise.all([oThis._getEconomyDetailsFromDdb(tokenIds), oThis._setCompanyTokenHolderAddress(tokenIds)]);

        await oThis._getTokenHoldersBalance(tokenIds);

        oThis._checkTokenHoldersBalance(tokenIds);

        await oThis._createEmailHook(tokenIds);
        oThis.canExit = true;
      }
    }
  }

  /**
   * Fetch client ids associated to chain and group.
   *
   * @sets oThis.clientIds
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchClientIdsForChainAndGroup() {
    const oThis = this;

    const dbRows = await new ClientConfigGroupModel()
      .select('client_id')
      .where({ chain_id: oThis.auxChainId, group_id: oThis.groupId })
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      oThis.clientIds.push(dbRows[index].client_id);
    }
  }

  /**
   * Set instance composer.
   *
   * @sets oThis.ic
   *
   * @returns {Promise<never>}
   * @private
   */
  async _setIc() {
    const oThis = this;

    const configStrategyResp = await new ConfigStrategyHelper(oThis.auxChainId).getComplete();
    // If config strategy fetch failed, then emit SIGINT.
    if (configStrategyResp.isFailure()) {
      return Promise.reject(new Error('Could not load config strategy.'));
    }

    const configStrategy = configStrategyResp.data;

    // Creating ic object using the config strategy.
    oThis.ic = new InstanceComposer(configStrategy);
  }

  /**
   * Check whether the passed clientIds have completed at least one successful stake and mint.
   *
   * @param {array<number>} clientIds
   *
   * @returns {Promise<array<number>>}
   * @private
   */
  async _checkClientStakeAndMintStatus(clientIds) {
    const dbRows = await new WorkflowModel()
      .select('DISTINCT client_id')
      .where({
        client_id: clientIds,
        kind: new WorkflowModel().invertedKinds[workflowConstants.btStakeAndMintKind],
        status: new WorkflowModel().invertedStatuses[workflowConstants.completedStatus]
      })
      .fire();

    const newClientIds = [];

    for (let index = 0; index < dbRows.length; index++) {
      newClientIds.push(dbRows[index].client_id);
    }

    return newClientIds;
  }

  /**
   * Fetch token ids.
   *
   * @param {array<number>} clientIds
   *
   * @sets oThis.tokenIdMap,
   *
   * @returns {Promise<{tokenIds: array<number>, clientIds: array<number>}>}
   * @private
   */
  async _fetchTokenIds(clientIds) {
    const oThis = this;

    const dbRows = await new TokenModel()
      .select(['id', 'name', 'client_id', 'decimal', 'properties'])
      .where({ client_id: clientIds, status: tokenConstants.invertedStatuses[tokenConstants.deploymentCompleted] })
      .fire();

    const tokenIds = [];
    const newClientIds = [];
    for (let index = 0; index < dbRows.length; index++) {
      const dbRow = dbRows[index];
      const tokenId = dbRow.id;
      newClientIds.push(dbRow.client_id);
      tokenIds.push(tokenId);

      oThis.tokenIdMap[tokenId] = {
        name: dbRow.name,
        clientId: dbRow.client_id,
        decimal: dbRow.decimal,
        properties: dbRow.properties
          ? util.getStringsForWhichBitsAreSet(dbRow.properties, tokenConstants.invertedPropertiesConfig)
          : [],
        economyContractAddress: '',
        totalSupply: '0',
        companyTokenHolderAddresses: [],
        propertyToSet: ''
      };
    }

    return { tokenIds: tokenIds, clientIds: newClientIds };
  }

  /**
   * Fetch token addresses.
   *
   * @param {array<number>} tokenIds
   *
   * @sets oThis.tokenIdMap, oThis.economyContractAddresses
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTokenAddresses(tokenIds) {
    const oThis = this;

    const promisesArray = [];

    for (let index = 0; index < tokenIds.length; index++) {
      const tokenId = tokenIds[index];

      promisesArray.push(
        new TokenAddressCache({
          tokenId: tokenId
        }).fetch()
      );
    }

    const promisesResponse = await Promise.all(promisesArray);

    for (let index = 0; index < tokenIds.length; index++) {
      const tokenId = tokenIds[index];
      const tokenAddresses = promisesResponse[index].data;

      const economyContractAddress = tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract];

      oThis.tokenIdMap[tokenId].economyContractAddress = economyContractAddress;
      oThis.economyContractAddresses.push(economyContractAddress);
    }
  }

  /**
   * Get economy details.
   *
   * @param {array<number>} tokenIds
   *
   * @sets oThis.tokenIdMap
   *
   * @return {Promise<*|result>}
   * @private
   */
  async _getEconomyDetailsFromDdb(tokenIds) {
    const oThis = this;

    const economyCache = new oThis.EconomyCache({
      chainId: oThis.auxChainId,
      economyContractAddresses: oThis.economyContractAddresses
    });

    const cacheResponse = await economyCache.fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetch economy details from DDB.');

      return Promise.reject(cacheResponse);
    }

    for (let index = 0; index < tokenIds.length; index++) {
      const tokenId = tokenIds[index];
      const economyContractAddress = oThis.tokenIdMap[tokenId].economyContractAddress;
      const economyDetails = cacheResponse.data[economyContractAddress];
      oThis.tokenIdMap[tokenId].totalSupply = basicHelper.toNormalPrecisionBT(
        economyDetails.totalSupply,
        oThis.tokenIdMap[tokenId].decimal
      );
    }
  }

  /**
   * Set company token holder addresses.
   *
   * @param {array<number>} tokenIds
   *
   * @sets oThis.tokenIdMap
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCompanyTokenHolderAddress(tokenIds) {
    const oThis = this;

    const TokenUserDetailsCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    for (let index = 0; index < tokenIds.length; index++) {
      const tokenId = tokenIds[index];

      const tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: tokenId }).fetch();

      if (
        tokenCompanyUserCacheRsp.isFailure() ||
        !tokenCompanyUserCacheRsp.data ||
        !tokenCompanyUserCacheRsp.data.userUuids
      ) {
        continue;
      }

      const tokenUserCacheResponse = await new TokenUserDetailsCache({
        tokenId: tokenId,
        userIds: tokenCompanyUserCacheRsp.data.userUuids
      }).fetch();

      const usersData = tokenUserCacheResponse.data;

      for (const uuid in usersData) {
        const userData = usersData[uuid];
        oThis.tokenIdMap[tokenId].companyTokenHolderAddresses.push(userData.tokenHolderAddress);
      }
    }
  }

  /**
   * Fetch balance of all token holder addresses.
   *
   * @param {array<number>} tokenIds
   *
   * @sets oThis.tokenIdMap
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTokenHoldersBalance(tokenIds) {
    const oThis = this;

    for (let index = 0; index < tokenIds.length; index++) {
      const tokenId = tokenIds[index];

      if (oThis.tokenIdMap[tokenId].companyTokenHolderAddresses.length === 0) {
        continue;
      }

      const ubtBalances = await new GetUbtBalance({
        auxChainId: oThis.auxChainId,
        tokenId: tokenId,
        addresses: oThis.tokenIdMap[tokenId].companyTokenHolderAddresses
      }).perform();

      let tokenHoldersBalanceBn = new BigNumber(0);

      for (const tha in ubtBalances) {
        const ubtBalance = ubtBalances[tha];

        tokenHoldersBalanceBn = new BigNumber(tokenHoldersBalanceBn).plus(new BigNumber(ubtBalance));
      }

      oThis.tokenIdMap[tokenId].tokenHoldersBalance = basicHelper.toNormalPrecisionBT(
        tokenHoldersBalanceBn,
        oThis.tokenIdMap[tokenId].decimal
      );
    }
  }

  /**
   * Check token holders balance and decide which property to set.
   *
   * @param {array<number>} tokenIds
   *
   * @private
   */
  _checkTokenHoldersBalance(tokenIds) {
    const oThis = this;

    for (let index = 0; index < tokenIds.length; index++) {
      const tokenId = tokenIds[index];

      const tokenHoldersBalance = parseFloat(oThis.tokenIdMap[tokenId].tokenHoldersBalance);
      const totalSupply = parseFloat(oThis.tokenIdMap[tokenId].totalSupply);

      if (tokenHoldersBalance <= 1) {
        oThis.tokenIdMap[tokenId].propertyToSet = tokenConstants.zeroBalanceEmail;
      } else if (tokenHoldersBalance < totalSupply * 0.05) {
        oThis.tokenIdMap[tokenId].propertyToSet = tokenConstants.veryLowBalanceEmail;
      } else if (tokenHoldersBalance < totalSupply * 0.1) {
        oThis.tokenIdMap[tokenId].propertyToSet = tokenConstants.lowBalanceEmail;
      }
    }
  }

  /**
   * Create email hook if needed. Update token property as well.
   *
   * @param {array<number>} tokenIds
   *
   * @returns {Promise<void>}
   * @private
   */
  async _createEmailHook(tokenIds) {
    const oThis = this;

    const promisesArray = [];

    for (let index = 0; index < tokenIds.length; index++) {
      const tokenId = tokenIds[index];
      const tokenObject = oThis.tokenIdMap[tokenId];

      if (!tokenObject.propertyToSet || tokenObject.properties.includes(tokenObject.propertyToSet)) {
        continue;
      }

      const templateVars = {
        [pepoCampaignsConstants.tokenName]: tokenObject.name,
        url_prefix: environmentConstants.urlPrefix,
        subject_prefix: basicHelper.isSandboxSubEnvironment() ? 'OST Platform Sandbox' : 'OST Platform'
      };

      promisesArray.push(
        // Send transactional email.
        new SendTransactionalMail({
          receiverEntityId: tokenObject.clientId,
          receiverEntityKind: emailServiceConstants.clientAllSuperAdminsReceiverEntityKind,
          templateName: oThis.getTemplateName(tokenObject.propertyToSet),
          templateVars: templateVars
        }).perform(),
        // Set property for token.
        new TokenModel()
          .update([
            'properties = properties | ?',
            tokenConstants.propertiesConfig[tokenConstants[tokenObject.propertyToSet]]
          ])
          .where({ id: tokenId })
          .fire()
      );
    }

    await Promise.all(promisesArray);

    // Clear token cache.
    const cacheClearPromisesArray = [];
    for (let index = 0; index < tokenIds.length; index++) {
      const tokenId = tokenIds[index];
      const tokenObject = oThis.tokenIdMap[tokenId];

      if (!tokenObject.propertyToSet || tokenObject.properties.includes(tokenObject.propertyToSet)) {
        continue;
      }

      cacheClearPromisesArray.push(TokenModel.flushCache({ clientId: tokenObject.clientId, tokenId: tokenId }));
    }

    await Promise.all(cacheClearPromisesArray);
  }

  /**
   * Get template name.
   *
   * @param {string} propertyToSet
   *
   * @returns {string}
   */
  getTemplateName(propertyToSet) {
    switch (propertyToSet) {
      case tokenConstants.zeroBalanceEmail:
        return pepoCampaignsConstants.platform_low_token_balance_0;
      case tokenConstants.veryLowBalanceEmail:
        return pepoCampaignsConstants.platform_low_token_balance_5;
      case tokenConstants.lowBalanceEmail:
        return pepoCampaignsConstants.platform_low_token_balance_10;
      default:
        throw new Error('Invalid property to set.');
    }
  }
}

// Perform action.
new CompanyLowBalanceAlertEmail({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
