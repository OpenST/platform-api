/**
 * Module for workflow router base.
 *
 * @module lib/workflow/RouterBase
 */

const rootPrefix = '../..',
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  WorkflowCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Workflow'),
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  WorkflowStatusCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/WorkflowStatus'),
  WorkflowByClientCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/WorkflowByClient'),
  WorkflowStepsStatusCache = require(rootPrefix + '/lib/cacheManagement/shared/WorkflowStepsStatus'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

/**
 * Class for workflow router base.
 *
 * @class WorkflowRouterBase
 */
class WorkflowRouterBase {
  /**
   * Constructor for workflow router base.
   *
   * @param {object} params
   * @param {number} params.currentStepId  id of process parent
   * @param {number} params.workflowId id of process parent
   * @param {string} params.stepKind Which step to execute in router
   * @param {string} params.topic
   * @param {string} params.chainId
   * @param {string} params.workflowKind Kind of workflow
   * @param {string} params.taskStatus task is 'taskReadyToStart' or 'taskDone' or 'taskFailed' status.
   * @param {object} params.taskResponseData when task is 'taskDone', send taskResponseData if required.
   * @param {object} params.debugParams
   * @param {number} params.clientId
   * @param {number} params.groupId
   * @param {object} params.payload
   * @param {object} params.requestParams
   * @param {object} params.feResponseData
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.currentStepId = params.currentStepId;
    oThis.workflowId = params.workflowId;
    oThis.topic = params.topic;
    oThis.workflowKind = params.workflowKind;
    oThis.chainId = params.chainId;

    oThis.stepKind = params.stepKind;
    oThis.taskStatus = params.taskStatus;
    oThis.taskResponseData = params.taskResponseData;
    oThis.debugParams = params.debugParams;

    oThis.clientId = params.clientId;
    oThis.groupId = params.groupId;

    oThis.requestParams = params.requestParams || {};
    oThis.feResponseData = params.feResponseData || {};

    oThis.taskDone = false;
    oThis.stepsToBePerformedOnSuccess = [];
    oThis.stepsToBePerformedOnFailure = [];
    oThis.workFlow = null;
    oThis.nextSteps = [];
    oThis.workflowStepKindToRecordMap = {};
    oThis.currentStepDataToBeUpdated = {};
    oThis.transactionHash = null;
    oThis.currentStepConfig = null;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(async function(error) {
      return oThis._handleCaughtErrors(error);
    });
  }

  /**
   * Async perform.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    oThis._fetchCurrentStepConfig();

    await oThis._validateConfig();

    await oThis._getWorkFlow();

    await oThis._getWorkFlowSteps();

    await oThis._validateAndSanitize();

    oThis._clubRequestParamsFromDependencies();

    await oThis._decideChainId();

    await oThis._performStepIfReadyToStart();

    oThis._prepareDataToBeUpdated();

    await oThis._updateCurrentStep();

    await oThis._updateWorkflow();

    await oThis._prepareForNextSteps();

    await oThis._insertAndPublishForNextSteps();

    await oThis._clearWorkflowStatusCache(oThis.workflowId);

    await oThis._clearWorkflowStepsStatusCache(oThis.workflowId);

    return responseHelper.successWithData({ workflow_id: oThis.workflowId });
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    throw new Error('sub-class to implement');
  }

  /**
   * Validate step config.
   *
   * @sets oThis.stepsToBePerformedOnSuccess, oThis.stepsToBePerformedOnFailure
   *
   * @returns {Promise<>}
   * @private
   */
  async _validateConfig() {
    const oThis = this;

    if (!oThis.currentStepConfig) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_rb_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stepKind: oThis.stepKind }
        })
      );
    }

    oThis.stepsToBePerformedOnSuccess = oThis.currentStepConfig.onSuccess || [];

    if (oThis.currentStepConfig.onFailure && oThis.currentStepConfig.onFailure != '') {
      oThis.stepsToBePerformedOnFailure = [oThis.currentStepConfig.onFailure];
    }

    oThis.readDataFromSteps = oThis.currentStepConfig.readDataFrom || [];

    return responseHelper.successWithData({});
  }

  /**
   * Get workflow details from workflows table.
   *
   * @sets oThis.workFlow, oThis.requestParams, oThis.clientId
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getWorkFlow() {
    const oThis = this;

    if (!oThis.workflowId) {
      return;
    }

    const workflowCacheResponse = await new WorkflowCache({
      workflowId: oThis.workflowId
    }).fetch();

    // Workflow does not exist for the given client.
    if (workflowCacheResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_rb_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { workflowId: oThis.workflowId }
        })
      );
    }
    oThis.clientId = workflowCacheResponse.data[oThis.workflowId].clientId;
    oThis.requestParams = JSON.parse(workflowCacheResponse.data[oThis.workflowId].requestParams);
  }

  /**
   * Get workflow steps.
   *
   * @sets oThis.workflowStepKindToRecordMap
   *
   * @return {Promise<void>}
   * @private
   */
  async _getWorkFlowSteps() {
    const oThis = this;

    if (!oThis.workflowId) {
      return;
    }

    const workflowRecords = await new WorkflowStepsModel()
      .select('*')
      .where(['workflow_id = (?)', oThis.workflowId])
      .where('unique_hash is NOT NULL')
      .fire();

    const stepKindsMap = new WorkflowStepsModel().kinds;

    for (let index = 0; index < workflowRecords.length; index++) {
      const step = workflowRecords[index];
      oThis.workflowStepKindToRecordMap[stepKindsMap[step.kind]] = step;
    }
  }

  /**
   * Validate and sanitize
   *
   * @sets oThis.requestParams, oThis.clientId
   *
   * @returns {Promise<>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    const allowedTaskStatus =
      oThis.taskStatus === workflowStepConstants.taskDone ||
      oThis.taskStatus === workflowStepConstants.taskReadyToStart ||
      oThis.taskStatus === workflowStepConstants.taskFailed;

    if (!oThis.taskStatus || !allowedTaskStatus) {
      logger.error('Unsupported Task status ' + oThis.taskStatus + ' inside lib/workflow/test/Router.js');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_rb_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: { taskStatus: oThis.taskStatus }
        })
      );
    }

    const currentRecord = oThis.workflowStepKindToRecordMap[oThis.stepKind];

    if (oThis.workflowId) {
      const statusMap = new WorkflowStepsModel().invertedStatuses,
        isQueuedStatus = currentRecord.status == statusMap[workflowStepConstants.queuedStatus],
        isPendingStatus = currentRecord.status == statusMap[workflowStepConstants.pendingStatus],
        isToBeProcessedStatus = isPendingStatus || isQueuedStatus;

      // Check for parent and current records
      if (!isToBeProcessedStatus) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_w_rb_5',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
      }
    }
  }

  /**
   * Club request params from all dependencies.
   *
   * @private
   */
  _clubRequestParamsFromDependencies() {
    const oThis = this;

    if (oThis.readDataFromSteps.length <= 0) {
      return;
    }

    for (let index = 0; index < oThis.readDataFromSteps.length; index++) {
      const dependencyKind = oThis.readDataFromSteps[index],
        step = oThis.workflowStepKindToRecordMap[dependencyKind];

      if (step.response_data) {
        Object.assign(oThis.requestParams, JSON.parse(step.response_data));
      }
    }
  }

  /**
   * Perform the steps if the current step is ready to start.
   *
   * @return {Promise<never>}
   * @private
   */
  async _performStepIfReadyToStart() {
    const oThis = this;

    if (oThis.taskStatus !== workflowStepConstants.taskReadyToStart) {
      return;
    }

    if (oThis.currentStepId) {
      await new WorkflowStepsModel().markAsPending(oThis.currentStepId);
    }

    if (oThis.workflowId) {
      await oThis._clearWorkflowCache(oThis.workflowId);
      await oThis._clearWorkflowStatusCache(oThis.workflowId);
      await oThis._clearWorkflowStepsStatusCache(oThis.workflowId);
    }

    // Catch all the errors
    let response = await oThis._performStep().catch(function(error) {
      return error;
    });

    if (!oThis.workflowId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_rb_11',
          api_error_identifier: 'something_went_wrong',
          debug_options: { error: response.toString() }
        })
      );
    }

    // If not our response, create one
    if (!responseHelper.isCustomResult(response)) {
      response = responseHelper.error({
        internal_error_identifier: 'l_w_rb_10',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: { error: response.toString(), workflowId: oThis.workflowId }
      });
    }

    if (response.isFailure()) {
      logger.error('Error......', response);

      response.data = response.data || {};
      response.data.taskStatus = workflowStepConstants.taskFailed;
    }
    oThis.taskStatus = response.data.taskStatus;
    oThis.taskResponseData = response.data.taskResponseData;
    oThis.transactionHash = response.data.transactionHash;
    oThis.debugParams = response.data.debugParams;
    oThis.retryFromId = response.data.retryFromId;
    oThis.feResponseData = response.data.feResponseData;
  }

  /**
   * Prepare data to be updated in the table.
   *
   * @private
   */
  _prepareDataToBeUpdated() {
    const oThis = this;

    oThis.currentStepDataToBeUpdated.request_params = basicHelper.isEmptyObject(oThis.requestParams)
      ? null
      : JSON.stringify(oThis.requestParams);

    if (oThis.transactionHash) {
      oThis.currentStepDataToBeUpdated.transaction_hash = oThis.transactionHash;
    }

    if (oThis.taskResponseData) {
      oThis.currentStepDataToBeUpdated.response_data = JSON.stringify(oThis.taskResponseData);
    }

    if (oThis.debugParams) {
      oThis.currentStepDataToBeUpdated.debug_params = JSON.stringify(oThis.debugParams);
    }

    if (oThis.taskStatus === workflowStepConstants.taskDone) {
      logger.step(`${oThis.stepKind}: called for taskDone`);
      oThis.currentStepDataToBeUpdated.status = new WorkflowStepsModel().invertedStatuses[
        workflowStepConstants.processedStatus
      ];
    } else if (oThis.taskStatus === workflowStepConstants.taskFailed) {
      oThis.currentStepDataToBeUpdated.status = new WorkflowStepsModel().invertedStatuses[
        workflowStepConstants.failedStatus
      ];
    } else if (oThis.taskStatus === workflowStepConstants.taskPending) {
      oThis.currentStepDataToBeUpdated.status = new WorkflowStepsModel().invertedStatuses[
        workflowStepConstants.pendingStatus
      ];
    }
  }

  /**
   * Update details of current step in the table.
   *
   * @return {Promise<*>}
   * @private
   */
  _updateCurrentStep() {
    const oThis = this;

    // Nothing to update.
    if (basicHelper.isEmptyObject(oThis.currentStepDataToBeUpdated) || !oThis.currentStepId) {
      return Promise.resolve();
    }

    return new WorkflowStepsModel().updateRecord(oThis.currentStepId, oThis.currentStepDataToBeUpdated);
  }

  /**
   * Update details of current step in the table.
   *
   * @return {Promise<*>}
   * @private
   */
  _updateWorkflow() {
    const oThis = this;

    // Nothing to update.
    if (basicHelper.isEmptyObject(oThis.feResponseData)) {
      return Promise.resolve();
    }

    return new WorkflowModel().updateResponseData(oThis.workflowId, oThis.feResponseData);
  }

  /**
   * Decide chainId based on step being.
   *
   * @private
   */
  _decideChainId() {
    const oThis = this;
    switch (oThis.stepKind) {
      case workflowStepConstants.generateTokenAddresses:
      case workflowStepConstants.deployOriginTokenOrganization:
      case workflowStepConstants.saveOriginTokenOrganization:
      case workflowStepConstants.deployOriginBrandedToken:
      case workflowStepConstants.saveOriginBrandedToken:
      case workflowStepConstants.deployTokenGateway:
      case workflowStepConstants.saveTokenGateway:
      case workflowStepConstants.activateTokenGateway:
      case workflowStepConstants.verifyActivateTokenGateway:
      case workflowStepConstants.setGatewayInBt:
      case workflowStepConstants.verifySetGatewayInBt:
      case workflowStepConstants.deployGatewayComposer:
      case workflowStepConstants.verifyDeployGatewayComposer:
      case workflowStepConstants.stPrimeStakeAndMintInit:
      case workflowStepConstants.stPrimeApprove:
      case workflowStepConstants.simpleTokenStake:
      case workflowStepConstants.progressStake:
      case workflowStepConstants.checkApproveStatus:
      case workflowStepConstants.checkStakeStatus:
      case workflowStepConstants.checkProgressStakeStatus:
      case workflowStepConstants.fetchStakeIntentMessageHash:
      case workflowStepConstants.btStakeAndMintInit:
      case workflowStepConstants.fetchStakeRequestHash:
      case workflowStepConstants.checkGatewayComposerAllowance:
      case workflowStepConstants.proveCoGatewayOnGateway:
      case workflowStepConstants.checkProveCoGatewayStatus:
      case workflowStepConstants.confirmRedeemIntent:
      case workflowStepConstants.checkConfirmRedeemStatus:
      case workflowStepConstants.progressUnstake:
      case workflowStepConstants.checkProgressUnstakeStatus:
        oThis.chainId = oThis.requestParams.originChainId;
        break;

      case workflowStepConstants.fundAuxFunderAddress:
      case workflowStepConstants.verifyFundAuxFunderAddress:
      case workflowStepConstants.fundAuxAdminAddress:
      case workflowStepConstants.verifyFundAuxAdminAddress:
      case workflowStepConstants.fundAuxWorkerAddress:
      case workflowStepConstants.verifyFundAuxWorkerAddress:
      case workflowStepConstants.fundTokenUserOpsWorker:
      case workflowStepConstants.verifyFundTokenUserOpsWorker:
      case workflowStepConstants.deployAuxTokenOrganization:
      case workflowStepConstants.saveAuxTokenOrganization:
      case workflowStepConstants.deployUtilityBrandedToken:
      case workflowStepConstants.saveUtilityBrandedToken:
      case workflowStepConstants.deployTokenCoGateway:
      case workflowStepConstants.saveTokenCoGateway:
      case workflowStepConstants.updateTokenInOstView:
      case workflowStepConstants.setCoGatewayInUbt:
      case workflowStepConstants.verifySetCoGatewayInUbt:
      case workflowStepConstants.setInternalActorForOwnerInUBT:
      case workflowStepConstants.verifySetInternalActorForOwnerInUBT:
      case workflowStepConstants.proveGatewayOnCoGateway:
      case workflowStepConstants.confirmStakeIntent:
      case workflowStepConstants.progressMint:
      case workflowStepConstants.checkProveGatewayStatus:
      case workflowStepConstants.checkConfirmStakeStatus:
      case workflowStepConstants.checkProgressMintStatus:
      case workflowStepConstants.verifyEconomySetup:
      case workflowStepConstants.assignShards:
      case workflowStepConstants.deployTokenRules:
      case workflowStepConstants.saveTokenRules:
      case workflowStepConstants.deployPricerRule:
      case workflowStepConstants.savePricerRule:
      case workflowStepConstants.registerPricerRule:
      case workflowStepConstants.verifyRegisterPricerRule:
      case workflowStepConstants.deployTokenHolderMasterCopy:
      case workflowStepConstants.saveTokenHolderMasterCopy:
      case workflowStepConstants.deployUserWalletFactory:
      case workflowStepConstants.saveUserWalletFactory:
      case workflowStepConstants.deployGnosisSafeMultiSigMasterCopy:
      case workflowStepConstants.saveGnosisSafeMultiSigMasterCopy:
      case workflowStepConstants.deployDelayedRecoveryModuleMasterCopy:
      case workflowStepConstants.saveDelayedRecoveryModuleMasterCopy:
      case workflowStepConstants.deployCreateAndAddModules:
      case workflowStepConstants.saveCreateAndAddModules:
      case workflowStepConstants.addUsdPriceOracleInPricerRule:
      case workflowStepConstants.verifyAddUsdPriceOracleInPricerRule:
      case workflowStepConstants.addEurPriceOracleInPricerRule:
      case workflowStepConstants.verifyAddEurPriceOracleInPricerRule:
      case workflowStepConstants.addGbpPriceOracleInPricerRule:
      case workflowStepConstants.verifyAddGbpPriceOracleInPricerRule:
      case workflowStepConstants.setUsdAcceptedMarginInPricerRule:
      case workflowStepConstants.verifySetUsdAcceptedMarginInPricerRule:
      case workflowStepConstants.setEurAcceptedMarginInPricerRule:
      case workflowStepConstants.verifySetEurAcceptedMarginInPricerRule:
      case workflowStepConstants.setGbpAcceptedMarginInPricerRule:
      case workflowStepConstants.verifySetGbpAcceptedMarginInPricerRule:
      case workflowStepConstants.deployProxyFactory:
      case workflowStepConstants.saveProxyFactory:
      case workflowStepConstants.initializeCompanyTokenHolderInDb:
      case workflowStepConstants.createCompanyWallet:
      case workflowStepConstants.verifyCreateCompanyWallet:
      case workflowStepConstants.setInternalActorForCompanyTHInUBT:
      case workflowStepConstants.verifySetInternalActorForCompanyTHInUBT:
      case workflowStepConstants.setInternalActorForTRInUBT:
      case workflowStepConstants.verifySetInternalActorForTRInUBT:
      case workflowStepConstants.setInternalActorForFacilitatorInUBT:
      case workflowStepConstants.verifySetInternalActorForFacilitatorInUBT:
      case workflowStepConstants.stPrimeWrapAsBT:
      case workflowStepConstants.checkWrapStPrimeStatus:
      case workflowStepConstants.stPrimeApproveCoGateway:
      case workflowStepConstants.checkApproveCoGatewayStatus:
      case workflowStepConstants.stPrimeRedeem:
      case workflowStepConstants.checkRedeemStatus:
      case workflowStepConstants.executeBTRedemption:
      case workflowStepConstants.checkExecuteBTRedemptionStatus:
      case workflowStepConstants.fetchRedeemIntentMessageHash:
      case workflowStepConstants.progressRedeem:
      case workflowStepConstants.checkProgressRedeemStatus:
      case workflowStepConstants.recordOrSubmitRequestStakeTx:
      case workflowStepConstants.recordOrSubmitApproveGCTx:
        oThis.chainId = oThis.requestParams.auxChainId;
        break;

      case workflowStepConstants.commitStateRoot:
      case workflowStepConstants.updateCommittedStateRootInfo:
        oThis.chainId = oThis.requestParams.destinationChainId;
        break;
    }
    // We are assigning oThis.chainId to requestParams because requestParams should contain the chainId that the
    // Current step needs to use. oThis.requestParams is being updated with the previous steps' chainId in two methods
    // Above, namely: _validateAndSanitize and _clubRequestParamsFromDependencies.
    oThis.requestParams.chainId = oThis.chainId;
  }

  /**
   * Prepare the params and table for the next steps.
   *
   * @returns {Promise<>}
   * @private
   */
  async _prepareForNextSteps() {
    const oThis = this;

    if (oThis.taskStatus === workflowStepConstants.taskDone) {
      oThis.nextSteps = oThis.stepsToBePerformedOnSuccess;
    } else if (oThis.taskStatus === workflowStepConstants.taskFailed) {
      // If retry needs to be attempted then perform
      if (oThis.retryFromId) {
        await oThis._performRetrialAttempt();
      } else {
        oThis.nextSteps = oThis.stepsToBePerformedOnFailure;
      }
    }
  }

  /**
   * Insert entries in table and publish messages for all the next steps.
   *
   * @returns {Promise<>}
   * @private
   */
  async _insertAndPublishForNextSteps() {
    const oThis = this;

    for (let index = 0; index < oThis.nextSteps.length; index++) {
      const nextStep = oThis.nextSteps[index];

      const dependencyResponse = await oThis.checkDependencies(nextStep);

      if (!dependencyResponse.data.dependencyResolved) {
        logger.debug(`${oThis.stepKind} : dependencyNotResolved: waiting`);
        continue;
      }

      await oThis._insertAndPublishFor(nextStep);
    }
  }

  /**
   * Insert entries in table and publish message for the next step.
   *
   * @returns {Promise<>}
   * @private
   */
  async _insertAndPublishFor(nextStep) {
    const oThis = this;

    const nextStepKind = new WorkflowStepsModel().invertedKinds[nextStep],
      nextStepStatus = new WorkflowStepsModel().invertedStatuses[workflowStepConstants.queuedStatus];

    logger.debug('Current Step:', oThis.stepKind, '      NextStep:', nextStep);

    const insertRsp = await oThis._insertWorkflowStep(nextStepKind, nextStepStatus);

    if (!insertRsp.isSuccess()) {
      return insertRsp;
    } else if (insertRsp.isSuccess() && !insertRsp.data.insertId) {
      return responseHelper.successWithData({});
    }

    await oThis._clearWorkflowStatusCache(oThis.workflowId);

    const nextStepId = insertRsp.data.insertId;

    const messageParams = {
      topics: [oThis.topic],
      publisher: oThis._publisher,
      message: {
        kind: oThis._messageKind,
        payload: {
          stepKind: nextStep,
          taskStatus: workflowStepConstants.taskReadyToStart,
          currentStepId: nextStepId,
          workflowId: oThis.workflowId,
          isRetrialAttempt: oThis.retryFromId ? 1 : 0
        }
      }
    };

    const rabbitParams = {
      connectionWaitSeconds: connectionTimeoutConstants.crons,
      switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons
    };

    if (oThis._rabbitmqKind === rabbitmqConstants.auxRabbitmqKind) {
      rabbitParams.auxChainId = oThis.requestParams.auxChainId;
    }

    const ostNotification = await rabbitmqProvider.getInstance(oThis._rabbitmqKind, rabbitParams),
      setToRMQ = await ostNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error('====Could not publish the message to RMQ====');

      return Promise.reject({ err: 'Could not publish next step in Rmq' });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Insert into workflow steps.
   *
   * @param {string} nextStepKind
   * @param {string} nextStepStatus
   *
   * @returns {Promise<*>}
   * @private
   */
  async _insertWorkflowStep(nextStepKind, nextStepStatus) {
    const oThis = this;

    let isDupEntry = false;

    const insertRsp = await new WorkflowStepsModel()
      .insert({
        kind: nextStepKind,
        workflow_id: oThis.workflowId,
        status: nextStepStatus,
        unique_hash: oThis.workflowId + ':' + nextStepKind
      })
      .fire()
      .catch(function(error) {
        if (error && error.code === 'ER_DUP_ENTRY') {
          logger.debug('------Trying for duplicate Entry--------');
          isDupEntry = true;
        } else {
          return Promise.reject(
            responseHelper.error({
              internal_error_identifier: 'l_w_rb_6',
              api_error_identifier: 'something_went_wrong',
              debug_options: { error: error }
            })
          );
        }
      });
    if (isDupEntry) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData({ insertId: insertRsp.insertId });
  }

  /**
   * Check dependencies.
   *
   * @param {string} nextStep
   *
   * @returns {Promise<any>}
   */
  async checkDependencies(nextStep) {
    const oThis = this;

    const nextStepDetails = await oThis.getNextStepConfigs(nextStep),
      prerequisitesKinds = [];

    if (nextStepDetails.prerequisites) {
      for (let index = 0; index < nextStepDetails.prerequisites.length; index++) {
        const invertedKind = new WorkflowStepsModel().invertedKinds[nextStepDetails.prerequisites[index]];
        if (invertedKind) {
          prerequisitesKinds.push(invertedKind);
        }
      }
    }

    if (prerequisitesKinds.length > 0) {
      const prerequisitesRecords = await new WorkflowStepsModel()
        .select('*')
        .where(['workflow_id = ? AND kind in (?)', oThis.workflowId, prerequisitesKinds])
        .where('unique_hash is NOT NULL')
        .fire();

      if (prerequisitesRecords.length !== nextStepDetails.prerequisites.length) {
        return responseHelper.successWithData({ dependencyResolved: 0 });
      }
      for (let index = 0; index < prerequisitesRecords.length; index++) {
        if (
          prerequisitesRecords[index].status !=
          new WorkflowStepsModel().invertedStatuses[workflowStepConstants.processedStatus]
        ) {
          return responseHelper.successWithData({ dependencyResolved: 0 });
        }
      }
    }

    return responseHelper.successWithData({ dependencyResolved: 1 });
  }

  /**
   * Clear workflow status cache.
   *
   * @param {number} id
   *
   * @return {Promise<void>}
   * @private
   */
  async _clearWorkflowStatusCache(id) {
    const workflowCacheObj = new WorkflowStatusCache({ workflowId: id });

    await workflowCacheObj.clear();
  }

  /**
   * Clear workflow cache.
   *
   * @param {number/string} id
   *
   * @return {Promise<void>}
   * @private
   */
  async _clearWorkflowCache(id) {
    const oThis = this;

    const workflowCacheObj = new WorkflowCache({ workflowId: id });

    await workflowCacheObj.clear();

    await oThis._clearWorkflowbyClientCache();
  }

  /**
   * Clear workflow by client cache.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearWorkflowbyClientCache() {
    const oThis = this;
    const workflowByClientCacheObj = new WorkflowByClientCache({ clientId: oThis.clientId });

    await workflowByClientCacheObj.clear();
  }

  /**
   * Clear workflow status cache.
   *
   * @param {number/string} id
   *
   * @return {Promise<void>}
   * @private
   */
  async _clearWorkflowStepsStatusCache(id) {
    const workflowStepsCacheObj = new WorkflowStepsStatusCache({ workflowId: id });

    await workflowStepsCacheObj.clear();
  }

  /**
   * First step of any workflow.
   *
   * @sets oThis.workflowId
   *
   * @returns {Promise<>}
   */
  async insertInitStep() {
    const oThis = this;

    const insertParams = {
      kind: new WorkflowModel().invertedKinds[oThis.workflowKind],
      status: new WorkflowModel().invertedStatuses[workflowConstants.inProgressStatus],
      response_data: JSON.stringify(oThis.feResponseData),
      request_params: JSON.stringify(oThis.requestParams),
      unique_hash: oThis._uniqueWorkflowHash()
    };

    if (oThis.clientId) {
      insertParams.client_id = oThis.clientId;
    }

    const workflowModelInsertResponse = await new WorkflowModel().insert(insertParams).fire();

    oThis.workflowId = workflowModelInsertResponse.insertId;

    await oThis._clearWorkflowCache(oThis.workflowId);
    await oThis._clearWorkflowStatusCache(oThis.workflowId);

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
  }

  /**
   * SHA Hash to uniquely identify workflow, to avoid same commits.
   *
   * @returns {string/null}
   * @private
   */
  _uniqueWorkflowHash() {
    return null;
  }

  /**
   * Returns publisher.
   *
   * @returns {string}
   * @private
   */
  get _publisher() {
    return 'OST_Workflow';
  }

  /**
   * Returns messageKind.
   *
   * @returns {string}
   * @private
   */
  get _messageKind() {
    return 'background_job';
  }

  /**
   * Returns rabbitMq kind
   *
   * @returns {string}
   * @private
   */
  get _rabbitmqKind() {
    throw new Error('Sub-class to implement');
  }

  /**
   * Current step payload which would be stored in Pending transactions and would help in restarting flow
   *
   * @returns {Hash}
   */
  _currentStepPayloadForPendingTrx() {
    const oThis = this;

    return {
      topics: [oThis.topic],
      publisher: oThis._publisher,
      message: {
        kind: oThis._messageKind,
        payload: {
          stepKind: oThis.stepKind,
          taskStatus: workflowStepConstants.taskDone,
          currentStepId: oThis.currentStepId,
          workflowId: oThis.workflowId,
          rabbitmqKind: oThis._rabbitmqKind
        }
      }
    };
  }

  /**
   * Perform step.
   *
   * @private
   */
  _performStep() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Update statuses in workflows and workflow steps table in case of errors
   *
   * @param {object} debugParams
   *
   * @return {Promise<void>}
   * @private
   */
  async _handleCaughtErrors(errorObject) {
    const oThis = this;

    let debugParams = '';
    if (responseHelper.isCustomResult(errorObject)) {
      logger.error(errorObject.getDebugData());
      debugParams = JSON.stringify(errorObject.getDebugData());
    } else {
      errorObject = responseHelper.error({
        internal_error_identifier: 'l_w_rb_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    }

    if (oThis.currentStepId) {
      await oThis._clearWorkflowStatusCache(oThis.workflowId);
      await oThis._clearWorkflowStepsStatusCache(oThis.currentStepId);

      await new WorkflowStepsModel().updateRecord(oThis.currentStepId, {
        debug_params: debugParams,
        status: new WorkflowStepsModel().invertedStatuses[workflowStepConstants.failedStatus]
      });
    }
    await oThis._clearWorkflowStepsStatusCache(oThis.currentStepId);
    await new WorkflowModel()
      .update({
        debug_params: debugParams,
        status: new WorkflowModel().invertedStatuses[workflowConstants.failedStatus]
      })
      .where({ id: oThis.workflowId })
      .fire();
    await oThis._clearWorkflowCache(oThis.workflowId);
    await oThis._clearWorkflowStatusCache(oThis.workflowId);

    if (oThis.workflowId) {
      let errObj = responseHelper.error({
        internal_error_identifier: 'workflow_failed:l_w_rb_7',
        api_error_identifier: 'workflow_failed',
        debug_options: { workflowId: oThis.workflowId }
      });
      await createErrorLogsEntry.perform(errObj, errorLogsConstants.highSeverity);
    }

    await oThis.ensureOnCatch();

    if (debugParams.includes('ER_DUP_ENTRY') && debugParams.includes('uk_uh')) {
      errorObject = responseHelper.error({
        internal_error_identifier: 'l_w_rb_12',
        api_error_identifier: 'something_went_wrong',
        debug_options: { error: debugParams.toString() }
      });
    }

    return errorObject;
  }

  /**
   * Add functionality here that subclass should ensure should happen when error in catch appears.
   *
   * @return {Promise<void>}
   */
  async ensureOnCatch() {
    return;
  }

  /**
   * Handle success.
   *
   * @return {Promise<void>}
   */
  async handleSuccess() {
    const oThis = this;

    // Update status of workflow as completedStatus in workflows table.
    const workflowsModelResp = await new WorkflowModel()
      .update({
        status: new WorkflowModel().invertedStatuses[workflowConstants.completedStatus]
      })
      .where({
        id: oThis.workflowId
      })
      .fire();

    await oThis._clearWorkflowCache(oThis.workflowId);

    // If row was updated successfully.
    if (+workflowsModelResp.affectedRows === 1) {
      logger.win('*** Workflow with id ', oThis.workflowId, 'completed successfully!');

      // Implicit string to int conversion.
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
    }

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed });
  }

  /**
   * Handle failure.
   *
   * @return {Promise<void>}
   */
  async handleFailure() {
    const oThis = this;

    // Update status of workflow as failedStatus in workflows table.
    const workflowsModelResp = await new WorkflowModel()
      .update({
        status: new WorkflowModel().invertedStatuses[workflowConstants.failedStatus]
      })
      .where({
        id: oThis.workflowId
      })
      .fire();

    await oThis._clearWorkflowCache(oThis.workflowId);

    const errorObject = responseHelper.error({
      internal_error_identifier: 'workflow_failed:l_w_rb_8',
      api_error_identifier: 'workflow_failed',
      debug_options: { workflowId: oThis.workflowId, workflowKind: oThis.workflowKind }
    });

    await createErrorLogsEntry.perform(errorObject, errorLogsConstants.highSeverity);

    // If row was updated successfully.
    if (+workflowsModelResp.affectedRows === 1) {
      logger.error('*** Workflow with id ', oThis.workflowId, 'failed!');

      // Implicit string to int conversion.
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
    }

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed });
  }

  /**
   * Perform Retrial attempt if passed.
   *
   * @return {Promise<void>}
   * @private
   */
  async _performRetrialAttempt() {
    const oThis = this;

    await new WorkflowStepsModel()
      .update({
        status: new WorkflowStepsModel().invertedStatuses[workflowStepConstants.retriedStatus],
        unique_hash: null
      })
      .where(['workflow_id = ? AND id >= ?', oThis.workflowId, oThis.retryFromId])
      .fire();

    const rec = await new WorkflowStepsModel()
      .select('*')
      .where({ id: oThis.retryFromId })
      .fire();
    oThis.nextSteps = [new WorkflowStepsModel().kinds[rec[0].kind]];
  }

  /**
   * Send webhook message to Preprocessor.
   *
   * @param {number/string} chainId
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   *
   * @returns {Promise<*>}
   */
  async sendPreprocessorWebhook(chainId, payload) {
    const oThis = this;

    await publishToPreProcessor.perform(chainId, payload, { workflowId: oThis.workflowId });
  }
}

module.exports = WorkflowRouterBase;
