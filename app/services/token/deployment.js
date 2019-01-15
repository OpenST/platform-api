'use strict';

/**
 * This service starts the deployment of token
 *
 * @module app/services/token/deployment
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  EconomySetupRouter = require(rootPrefix + '/executables/workflowRouter/economySetupRouter'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  economyFormatter = require(rootPrefix + '/lib/formatter/entity/economy');

const InstanceComposer = OSTBase.InstanceComposer;

class Deployment {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.clientId = params.client_id; //Needs clarification if this is needed or not
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
   * startTokenDeployment
   *
   * @return {Promise<*|result>}
   */
  async startTokenDeployment() {
    const oThis = this;

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
  }
}

InstanceComposer.registerAsShadowableClass(Deployment, coreConstants.icNameSpace, 'tokenDeployment');
