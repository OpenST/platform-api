'use strict';
/**
 * This service starts the deployment of token
 *
 * @module app/services/token/Deployment
 */
const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  ClientPreProvisoning = require(rootPrefix + '/app/models/mysql/ClientPreProvisoning'),
  GrantEthOst = require(rootPrefix + '/app/services/token/GrantEthOst'),
  ConfigGroupsModel = require(rootPrefix + '/app/models/mysql/ConfigGroup'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  configGroupConstants = require(rootPrefix + '/lib/globalConstant/configGroups'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ClientConfigGroupModel = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  EconomySetupRouter = require(rootPrefix + '/executables/workflowRouter/EconomySetupRouter'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup'),
  ClientWhitelistingCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ClientWhitelisting');

/**
 * Class for token deployment
 *
 * @class
 */
class Deployment {
  /**
   * Constructor for token deployment
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.clientId = params.client_id;
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/token/Deployment::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 's_t_d_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validateRequest();

    let tokenDeploymentResponse = await oThis.startTokenDeployment();

    if (!tokenDeploymentResponse.isSuccess()) {
      return Promise.reject(tokenDeploymentResponse);
    }

    let startGrantEthOstResponse = await oThis._grantEthOst();

    return Promise.resolve(tokenDeploymentResponse);
  }

  /**
   *
   * Validate request
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateRequest() {
    const oThis = this;

    if (basicHelper.isSandboxSubEnvironment()) {
      return responseHelper.successWithData({});
    }

    let rsp = await new ClientWhitelistingCache({ clientId: oThis.clientId }).fetch();

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
   * @return {Promise<void>}
   *
   * @private
   */
  async _insertAndFetchConfigGroup() {
    const oThis = this;

    // Fetch client config group.
    let clientConfigStrategyCacheObj = new ClientConfigGroupCache({ clientId: oThis.clientId }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

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
   *
   * @private
   */
  async _assignConfigGroupsToClient() {
    const oThis = this;

    let rsp = await oThis._getChainIdFromPreProvisioning(),
      insertParams = rsp.data;

    if (!insertParams.groupId) {
      let configGroups = new ConfigGroupsModel(),
        configGroupsResponse = await configGroups
          .select('*')
          .where({
            is_available_for_allocation: new ConfigGroupsModel().invertedIsAvailableForAllocation[
              configGroupConstants.availableForAllocation
            ]
          })
          .fire();

      // Select config group on round robin basis.
      let configGroupRow = oThis.clientId % configGroupsResponse.length;

      // Fetch config group.
      let configGroup = configGroupsResponse[configGroupRow];

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
   *
   * fetch chain id from client pre provisioning
   *
   * @return {Promise<object>}
   * @private
   */
  async _getChainIdFromPreProvisioning() {
    const oThis = this;

    let returnData;

    let clientPreProvisoningConfig = await new ClientPreProvisoning().getDetailsByClientId(oThis.clientId);

    if (clientPreProvisoningConfig.data.config && clientPreProvisoningConfig.data.config.config_group_id) {
      let configGroupsModel = new ConfigGroupsModel(),
        dbRows = await configGroupsModel
          .select('*')
          .where({
            id: clientPreProvisoningConfig.data.config.config_group_id
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
   * @param {String/Number} clientId
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fetchWorkflowDetails(clientId) {
    return await new WorkflowModel()
      .select('*')
      .where({
        client_id: clientId
      })
      .order_by('created_at DESC')
      .limit(1)
      .fire();
  }

  /**
   * Fetch token details
   *
   * @param {String/Number} clientId
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenDetails(clientId) {
    let cacheResponse = await new TokenCache({ clientId: clientId }).fetch();

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

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   *
   * @Sets oThis.originChainId
   */
  async _fetchOriginChainId() {
    const oThis = this;
    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.constants),
      configConstants = csResponse.data[configStrategyConstants.constants];

    oThis.originChainId = configConstants.originChainId;
  }

  /**
   * Start token deployment
   *
   * @return {Promise<*|result>}
   */
  async startTokenDeployment() {
    const oThis = this;

    // Update status of token deployment as deploymentStarted in tokens table.
    let tokenModelResp = await new TokenModel()
      .update({
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]
      })
      .where({
        id: oThis.tokenId,
        status: new TokenModel().invertedStatuses[tokenConstants.notDeployed]
      })
      .fire();

    // Clear token cache.
    await new TokenCache({ clientId: oThis.clientId }).clear();

    // If row was updated successfully.
    if (+tokenModelResp.affectedRows === 1) {
      // Implicit string to int conversion.

      await oThis._fetchOriginChainId();

      // Fetch config group for the client.
      await oThis._insertAndFetchConfigGroup();

      let economySetupRouterParams = {
        stepKind: workflowStepConstants.economySetupInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.chainId,
        topic: workflowTopicConstant.economySetup,
        requestParams: {
          tokenId: oThis.tokenId,
          auxChainId: oThis.chainId,
          originChainId: oThis.originChainId,
          clientId: oThis.clientId
        }
      };

      let economySetupRouterObj = new EconomySetupRouter(economySetupRouterParams);

      return economySetupRouterObj.perform();
    }
    // Status of token deployment is not as expected.
    else {
      // Fetch token details.
      let tokenDetails = await oThis._fetchTokenDetails(oThis.clientId);

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
      else {
        switch (tokenDetails.status.toString()) {
          case new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]:
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

          case new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_5',
              api_error_identifier: 'token_already_deployed',
              debug_options: { tokenStatus: tokenDetails.status }
            });

          case new TokenModel().invertedStatuses[tokenConstants.deploymentFailed]:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_6',
              api_error_identifier: 'token_deployment_failed',
              debug_options: { tokenStatus: tokenDetails.status }
            });

          default:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_7',
              api_error_identifier: 'something_went_wrong',
              debug_options: { tokenStatus: tokenDetails.status }
            });
        }
      }
    }
  }

  /**
   * Call service which grants ETH and OST to given address.
   *
   * @return {Promise<*>}
   */
  async _grantEthOst() {
    const oThis = this;

    // fetch meta-mask address for client
    let tokenAddressCacheRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenAddressCacheRsp.isFailure()) {
      return Promise.reject(tokenAddressCacheRsp);
    }

    // meta-mask address will be the ownerAddress from token deployment.
    let ownerAddress = tokenAddressCacheRsp.data[tokenAddressConstants.ownerAddressKind];

    // grant ETH and OST for this address.
    let grantEthOst = new GrantEthOst({ clientId: oThis.clientId, address: ownerAddress }),
      grantEthOstResponse = await grantEthOst.perform();

    if (!grantEthOstResponse.isSuccess()) {
      logger.error('Granting ETH and OST has been failed.');
      return Promise.resolve(grantEthOstResponse);
    }

    return Promise.resolve(grantEthOstResponse);
  }
}

module.exports = Deployment;
