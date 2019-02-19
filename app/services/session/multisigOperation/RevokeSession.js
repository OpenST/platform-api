'use strict';

/**
 *  Revoke session multi sig operation
 *
 * @module app/services/session/multisigOperation/RevokeSession
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/app/services/session/multisigOperation/Base'),
  RevokeSessionRouter = require(rootPrefix + '/executables/auxWorkflowRouter/multisigOperation/RevokeSessionRouter'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');
require(rootPrefix + '/app/models/ddb/sharded/Session.js');

class RevokeSession extends Base {
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.spendingLimit = params.raw_calldata['parameters'][1];
    oThis.expirationHeight = params.raw_calldata['parameters'][2];
  }

  /**
   * perform operation
   *
   * @returns {Promise<any>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    let updateResponse = await oThis._updateEntryInSessionsTable();

    await oThis._startWorkflow();

    return oThis._prepareResponseEntity(updateResponse);
  }

  /**
   * updates entry in sessions table
   *
   * @returns {Promise<any>}
   * @private
   */
  async _updateEntryInSessionsTable() {
    const oThis = this;
    logger.debug('****Updating entry in sessions table');

    let SessionModel = ic.getShadowedClassFor('saas::SaasNamespace', 'SessionModel'),
      sessionModelObj = new SessionModel({ shardNumber: oThis.sessionShardNumber }),
      updateResponse = await sessionModelObj.updateStatusFromInitialToFinal(
        oThis.userId,
        oThis.sessionKey,
        sessionConstants.authorizedStatus,
        sessionConstants.revokingStatus
      );

    if (updateResponse.isFailure()) {
      logger.error('Session address status is not authorized. Thus conditional check failed');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_rs_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return updateResponse;
  }

  /**
   * Starts the workflow to submit authorize device transaction
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the revoke session workflow ');
    let requestParams = {
        auxChainId: oThis._configStrategyObject.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        sessionKey: oThis.sessionKey,
        to: oThis.to,
        value: oThis.value,
        calldata: oThis.calldata,
        rawCalldata: oThis.rawCalldata,
        operation: oThis.operation,
        safeTxGas: oThis.safeTxGas,
        dataGas: oThis.dataGas,
        gasPrice: oThis.gasPrice,
        gasToken: oThis.gasToken,
        refundReceiver: oThis.refundReceiver,
        signature: oThis.signature,
        signer: oThis.signer,
        chainEndpoint: oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite),
        sessionShardNumber: oThis.sessionShardNumber,
        multisigAddress: oThis.multisigProxyAddress
      },
      revokeSessionInitParams = {
        stepKind: workflowStepConstants.revokeSessionInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.revokeSession,
        requestParams: requestParams
      };

    let revokeSessionObj = new RevokeSessionRouter(revokeSessionInitParams);

    return revokeSessionObj.perform();
  }

  /**
   * Prepares the response for Authorize Device service.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _prepareResponseEntity(updateResponse) {
    const oThis = this;
    logger.debug('****Preparing revoke session service response');
    let response = {};

    response[resultType.session] = updateResponse.data;

    return responseHelper.successWithData(response);
  }
}

InstanceComposer.registerAsShadowableClass(RevokeSession, coreConstants.icNameSpace, 'RevokeSession');
