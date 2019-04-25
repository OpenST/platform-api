/**
 * Module to start deployment of token.
 *
 * @module app/services/token/Deployment
 */

const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  ConfigGroupsModel = require(rootPrefix + '/app/models/mysql/ConfigGroup'),
  EconomySetupRouter = require(rootPrefix + '/lib/workflow/economySetup/Router'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ClientConfigGroupModel = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ClientPreProvisioning = require(rootPrefix + '/app/models/mysql/ClientPreProvisioning'),
  GrantEthStakeCurrency = require(rootPrefix + '/app/services/token/GrantEthStakeCurrency'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup'),
  ClientWhitelistingCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ClientWhitelisting'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  configGroupConstants = require(rootPrefix + '/lib/globalConstant/configGroups'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to start deployment of token.
 *
 * @class Deployment
 */
class Deployment {
  /**
   * Constructor to start deployment of token.
   *
   * @param {object} params
   * @param {string/number} params.token_id
   * @param {string/number} params.client_id
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.clientId = params.client_id;
  }

  /**
   * Main performer of class.
   *
   * @return {Promise<>}
   */
  perform() {
    // TODO - use perform from servicebase
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('app/services/token/Deployment::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 's_t_d_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validateRequest();

    const tokenDeploymentResponse = await oThis.startTokenDeployment();

    if (!tokenDeploymentResponse.isSuccess()) {
      return Promise.reject(tokenDeploymentResponse);
    }

    // Grant Eth and Stake currency only if it is sandbox environment.
    if (basicHelper.isSandboxSubEnvironment()) {
      await oThis._grantEthStakeCurrency();
    }

    return tokenDeploymentResponse;
  }

  /**
   * Validate request.
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateRequest() {
    const oThis = this;

    if (basicHelper.isSandboxSubEnvironment()) {
      return responseHelper.successWithData({});
    }

    const rsp = await new ClientWhitelistingCache({ clientId: oThis.clientId }).fetch();

    if (!rsp.data.id) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_d_2',
          api_error_identifier: 'unauthorized_for_main_env'
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * Fetch config group for the client. If config group is not assigned for the client, assign one.
   *
   * @sets oThis.chainId
   *
   * @return {Promise<void>}
   * @private
   */
  async _insertAndFetchConfigGroup() {
    const oThis = this;

    // Fetch client config group.
    const clientConfigStrategyCacheObj = new ClientConfigGroupCache({ clientId: oThis.clientId });
    let fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    if (fetchCacheRsp.isSuccess()) {
      // Config group is already associated for the given client.
      oThis.chainId = fetchCacheRsp.data[oThis.clientId].chainId;
    } else {
      // Config group is not associated for the given client.
      fetchCacheRsp = await oThis._assignConfigGroupsToClient();

      oThis.chainId = fetchCacheRsp.data.chainId;
    }
  }

  /**
   * Assign config group to the clientId.
   *
   * @return {Promise<void>}
   * @private
   */
  async _assignConfigGroupsToClient() {
    const oThis = this;

    const rsp = await oThis._getChainIdFromPreProvisioning();
    let insertParams = rsp.data;

    if (!insertParams.groupId) {
      const configGroups = new ConfigGroupsModel(),
        configGroupsResponse = await configGroups
          .select('*')
          .where({
            is_available_for_allocation: new ConfigGroupsModel().invertedIsAvailableForAllocation[
              configGroupConstants.availableForAllocation
            ]
          })
          .fire();

      // Select config group on round robin basis.
      const configGroupRow = oThis.clientId % configGroupsResponse.length;

      // Fetch config group.
      const configGroup = configGroupsResponse[configGroupRow];

      insertParams = {
        chainId: configGroup.chain_id,
        groupId: configGroup.group_id
      };
    }

    insertParams.clientId = oThis.clientId;

    // Insert entry in client config groups table.
    await new ClientConfigGroupModel().insertRecord(insertParams);

    logger.step('Entry created in client config groups table.');

    return responseHelper.successWithData(insertParams);
  }

  /**
   * Fetch chain id from client pre provisioning.
   *
   * @return {Promise<object>}
   * @private
   */
  async _getChainIdFromPreProvisioning() {
    const oThis = this;

    let returnData;

    const clientPreProvisioningConfig = await new ClientPreProvisioning().getDetailsByClientId(oThis.clientId);

    if (clientPreProvisioningConfig.data.config && clientPreProvisioningConfig.data.config.config_group_id) {
      const configGroupsModel = new ConfigGroupsModel(),
        dbRows = await configGroupsModel
          .select('*')
          .where({
            id: clientPreProvisioningConfig.data.config.config_group_id
          })
          .fire();

      if (dbRows.length === 1) {
        returnData = {
          chainId: dbRows[0].chain_id,
          groupId: dbRows[0].group_id
        };
      }
    }

    return responseHelper.successWithData(returnData);
  }

  /**
   * Fetch latest workflow details for the client.
   *
   * @param {string/number} clientId
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchWorkflowDetails(clientId) {
    return new WorkflowModel()
      .select('*')
      .where({
        client_id: clientId
      })
      .order_by('created_at DESC')
      .limit(1)
      .fire();
  }

  /**
   * Fetch token details.
   *
   * @param {string/number} clientId
   *
   * @return {Promise<object>}
   * @private
   */
  async _fetchTokenDetails(clientId) {
    const cacheResponse = await new TokenCache({ clientId: clientId }).fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched token details.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_d_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: clientId
          }
        })
      );
    }

    return cacheResponse.data;
  }

  /**
   * Object of config strategy klass
   *
   * @sets oThis.originChainId
   *
   * @return {object}
   */
  async _fetchOriginChainId() {
    const oThis = this;

    const csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.constants),
      configConstants = csResponse.data[configStrategyConstants.constants];

    oThis.originChainId = configConstants.originChainId;
  }

  /**
   * Start token deployment.
   *
   * @return {Promise<*|result>}
   */
  async startTokenDeployment() {
    const oThis = this;

    // Update status of token deployment as deploymentStarted in tokens table.
    const tokenModelResp = await new TokenModel()
      .update({
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]
      })
      .where({
        id: oThis.tokenId,
        status: new TokenModel().invertedStatuses[tokenConstants.notDeployed]
      })
      .fire();

    // Clear token cache.
    await TokenModel.flushCache({ clientId: oThis.clientId, tokenId: oThis.tokenId });

    // If row was updated successfully.
    if (+tokenModelResp.affectedRows === 1) {
      // Implicit string to int conversion.

      await oThis._fetchOriginChainId();

      // Fetch config group for the client.
      await oThis._insertAndFetchConfigGroup();

      await oThis._fetchStakeCurrencyContractAddress();

      const economySetupRouterParams = {
        stepKind: workflowStepConstants.economySetupInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.chainId,
        topic: workflowTopicConstant.economySetup,
        requestParams: {
          tokenId: oThis.tokenId,
          auxChainId: oThis.chainId,
          originChainId: oThis.originChainId,
          clientId: oThis.clientId,
          stakeCurrencyContractAddress: oThis.stakeCurrencyContractAddress
        }
      };

      const economySetupRouterObj = new EconomySetupRouter(economySetupRouterParams);

      return economySetupRouterObj.perform();
    }
    // Status of token deployment is not as expected.

    // Fetch token details.
    const tokenDetails = await oThis._fetchTokenDetails(oThis.clientId);

    // If token does not exist in the table.
    if (Object.keys(tokenDetails) < 1) {
      logger.error('Token does not exist.');

      return responseHelper.error({
        internal_error_identifier: 's_t_d_3',
        api_error_identifier: 'invalid_branded_token',
        debug_options: {}
      });
    }
    // Token exists in the table.

    switch (tokenDetails.status.toString()) {
      case new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]: {
        // Fetch latest workflow details for the client.
        let workflowDetails = await oThis._fetchWorkflowDetails(oThis.clientId);

        // Workflow for the client has not been initiated yet.
        if (workflowDetails.length !== 1) {
          logger.error('Workflow for the client has not been initiated yet.');

          return responseHelper.error({
            internal_error_identifier: 's_t_d_4',
            api_error_identifier: 'token_not_setup',
            debug_options: {}
          });
        }

        workflowDetails = workflowDetails[0];

        return responseHelper.successWithData({ workflow_id: workflowDetails.id });
      }

      case new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]: {
        return responseHelper.error({
          internal_error_identifier: 's_t_d_5',
          api_error_identifier: 'token_already_deployed',
          debug_options: { tokenStatus: tokenDetails.status }
        });
      }
      case new TokenModel().invertedStatuses[tokenConstants.deploymentFailed]: {
        return responseHelper.error({
          internal_error_identifier: 's_t_d_6',
          api_error_identifier: 'token_deployment_failed',
          debug_options: { tokenStatus: tokenDetails.status }
        });
      }
      default:
        return responseHelper.error({
          internal_error_identifier: 's_t_d_7',
          api_error_identifier: 'something_went_wrong',
          debug_options: { tokenStatus: tokenDetails.status }
        });
    }
  }

  /**
   * This function fetches and sets stake currency contract address.
   *
   * @sets oThis.stakeCurrencyContractAddress
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchStakeCurrencyContractAddress() {
    const oThis = this;

    const tokenDetails = await oThis._fetchTokenDetails(oThis.clientId),
      stakeCurrencyId = tokenDetails.stakeCurrencyId,
      stakeCurrencyDetails = await oThis._fetchStakeCurrencyDetails(stakeCurrencyId);

    oThis.stakeCurrencyContractAddress = stakeCurrencyDetails.contractAddress;
  }

  /**
   * This function fetches stake currency details.
   *
   * @param {number} stakeCurrencyId
   * @returns {Promise<*>}
   * @private
   */
  async _fetchStakeCurrencyDetails(stakeCurrencyId) {
    const oThis = this;

    const stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({
      stakeCurrencyIds: [stakeCurrencyId]
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      logger.error('Could not fetch stake currency details.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_d_8',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            stakeCurrencyIds: [oThis.stakeCurrencyId]
          }
        })
      );
    }

    return stakeCurrencyCacheResponse.data[stakeCurrencyId];
  }

  /**
   * Call service which grants ETH and Stake currency to given address.
   *
   * @return {Promise<*>}
   */
  async _grantEthStakeCurrency() {
    const oThis = this;

    // Fetch meta-mask address for client.
    const tokenAddressCacheRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenAddressCacheRsp.isFailure()) {
      return Promise.reject(tokenAddressCacheRsp);
    }

    // Meta-mask address will be the ownerAddress from token deployment.
    const ownerAddress = tokenAddressCacheRsp.data[tokenAddressConstants.ownerAddressKind];

    // Grant ETH and Stake currency for this address.
    const grantEthStakeCurrency = new GrantEthStakeCurrency({ client_id: oThis.clientId, address: ownerAddress }),
      grantEthStakeCurrencyResponse = await grantEthStakeCurrency.perform();

    if (!grantEthStakeCurrencyResponse.isSuccess()) {
      logger.error('Granting ETH and Stake currency has been failed.');

      return Promise.resolve(grantEthStakeCurrencyResponse);
    }

    return Promise.resolve(grantEthStakeCurrencyResponse);
  }
}

module.exports = Deployment;
