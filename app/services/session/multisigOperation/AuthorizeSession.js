'use strict';

/**
 *  Authorize session multi sig operation
 *
 * @module app/services/session/multisigOperation/AuthorizeSession.js
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
  AuthorizeSessionRouter = require(rootPrefix +
    '/executables/auxWorkflowRouter/multisigOperation/AuthorizeSessionRouter'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');

class AuthorizeSession extends Base {
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

    await oThis._addEntryInSessionsTable();

    await oThis._startWorkflow();

    return oThis._prepareResponseEntity();
  }

  /**
   * Adds an entry in sessions table
   *
   * @returns {Promise<any>}
   * @private
   */
  async _addEntryInSessionsTable() {
    const oThis = this;
    logger.debug('****Creating entry in sessions table');

    let paramsForAddSessions = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      sessionAddresses: [oThis.sessionKey],
      sessionExpiration: oThis.expirationHeight,
      sessionSpendingLimit: oThis.spendingLimit
    };
    let AddSessionsAddressKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddSessionAddresses'),
      addSessionsAddressObj = new AddSessionsAddressKlass(paramsForAddSessions);

    await addSessionsAddressObj.perform();

    return responseHelper.successWithData({});
  }

  /**
   * Starts the workflow to submit authorize device transaction
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the authorize session workflow ');
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
      authorizeSessionInitParams = {
        stepKind: workflowStepConstants.authorizeSessionInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.authorizeSession,
        requestParams: requestParams
      };

    let authorizeSessionObj = new AuthorizeSessionRouter(authorizeSessionInitParams);

    return authorizeSessionObj.perform();
  }

  /**
   * Prepares the response for Authorize Device service.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _prepareResponseEntity() {
    const oThis = this;
    logger.debug('****Preparing authorize session service response');
    let sessionDetailsAfterUpdateRsp = await super._fetchSessionDetails(),
      response = {};

    response[resultType.session] = sessionDetailsAfterUpdateRsp.data;

    return responseHelper.successWithData(response);
  }
}

InstanceComposer.registerAsShadowableClass(AuthorizeSession, coreConstants.icNameSpace, 'AuthorizeSession');
