'use strict';
/**
 * This service starts the deployment of token
 *
 * @module app/services/token/deployment
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  EconomySetupRouter = require(rootPrefix + '/executables/workflowRouter/economySetupRouter');

class Deployment {
  /**
   * @constructor
   *
   * @param params
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
        logger.error('app/services/token/deployment::perform::catch');
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

    await oThis.startTokenDeployment();
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
    return await new WorkflowStepsModel()
      .select('*')
      .where({
        client_id: clientId
      })
      .order_by('created_at DESC')
      .limit(1);
  }

  /**
   * Fetch token details
   *
   * @param {String/Number} tokenId
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenDetails(tokenId) {
    return await new TokenModel()
      .select('*')
      .where({
        id: tokenId
      })
      .fire();
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

    // If row was updated successfully.
    if (+tokenModelResp.affectedRows === 1) {
      // Implicit string to int conversion.
      //TODO: Associate / fetch existing config group for client
      let economySetupRouterParams = {
        stepKind: workflowStepConstants.economySetupInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: 2000, //ToDO: To be decided how to assign a chain Id to particular client
        topic: workflowTopicConstant.economySetup,
        requestParams: { tokenId: oThis.tokenId, chainId: 2000, clientId: oThis.clientId }
      };

      let economySetupRouterObj = new EconomySetupRouter(economySetupRouterParams),
        economyDeploymentResponse = await economySetupRouterObj.perform();

      return economyDeploymentResponse;
    }
    // Status of token deployment is not as expected.
    else {
      // Fetch token details.
      let tokenDetails = await oThis._fetchTokenDetails(oThis.tokenId);

      // If token does not exist in the table.
      if (tokenDetails.length !== 1) {
        logger.error('Token does not exist.');

        return responseHelper.error({
          internal_error_identifier: 's_t_d_3',
          api_error_identifier: 'invalid_branded_token',
          debug_options: {}
        });
      }
      // Token exists in the table.
      else {
        tokenDetails = tokenDetails[0];

        switch (tokenDetails.status) {
          case new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]:
            // Fetch latest workflow details for the client.
            let workflowDetails = await oThis._fetchWorkflowDetails(oThis.clientId);

            // Workflow for the client has not been initiated yet.
            if (workflowDetails.length !== 1) {
              logger.error('Workflow for the client has not been initiated yet.');

              return responseHelper.error({
                internal_error_identifier: 's_t_d_2',
                api_error_identifier: 'token_not_setup',
                debug_options: {}
              });
            }

            workflowDetails = workflowDetails[0];

            return responseHelper.successWithData({ workflowId: workflowDetails.parent_id });

          case new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_4',
              api_error_identifier: 'token_already_deployed',
              debug_options: { tokenStatus: tokenDetails.status }
            });

          case new TokenModel().invertedStatuses[tokenConstants.deploymentFailed]:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_5',
              api_error_identifier: 'token_deployment_failed',
              debug_options: { tokenStatus: tokenDetails.status }
            });

          default:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_6',
              api_error_identifier: 'something_went_wrong',
              debug_options: { tokenStatus: tokenDetails.status }
            });
        }
      }
    }
  }
}

InstanceComposer.registerAsShadowableClass(Deployment, coreConstants.icNameSpace, 'tokenDeployment');
