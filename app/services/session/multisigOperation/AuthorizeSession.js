'use strict';

/**
 *  Authorize session multi sig operation
 *
 * @module app/services/session/multisigOperation/AuthorizeSession
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
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

/**
 * Class to authorize session multi sig operation
 *
 * @class AuthorizeSession
 */
class AuthorizeSession extends Base {
  /**
   *
   * @param {Object} params
   * @param {Object} params.raw_calldata -
   * @param {String} params.raw_calldata.method - possible value authorizeSession
   * @param {Array} params.raw_calldata.parameters -
   * @param {String} params.raw_calldata.parameters[0] - new session address
   * @param {String} params.raw_calldata.parameters[1] - spending limit in wei
   * @param {String/Number} params.raw_calldata.parameters[2] - expiration height
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.rawCalldata = params.raw_calldata;

    oThis.sessionKey = null;
    oThis.spendingLimit = null;
    oThis.expirationHeight = null;
  }

  /**
   * Sanitize service specific params
   *
   * @private
   */
  _sanitizeSpecificParams() {
    const oThis = this;

    let rawCallDataMethod = oThis.rawCalldata.method;
    if (rawCallDataMethod !== 'authorizeSession') {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_as_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_method'],
          debug_options: {}
        })
      );
    }

    let rawCallDataParameters = oThis.rawCalldata.parameters;
    if (!(rawCallDataParameters instanceof Array) || !CommonValidators.validateEthAddress(rawCallDataParameters[0])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_as_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_address'],
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroWeiValue(rawCallDataParameters[1])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_as_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_spending_limit'],
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(rawCallDataParameters[2])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_as_4',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_expiration_height'],
          debug_options: {}
        })
      );
    }

    oThis.sessionKey = basicHelper.sanitizeAddress(rawCallDataParameters[0]);
    oThis.spendingLimit = String(rawCallDataParameters[1]);
    oThis.expirationHeight = Number(rawCallDataParameters[2]);
  }

  /**
   * Performs specific pre checks
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performSpecificPreChecks() {
    return responseHelper.successWithData({});
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
        signatures: oThis.signatures,
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
    let sessionDetailsAfterUpdateRsp = await super._fetchSessionDetails(oThis.sessionKey),
      response = {};

    response[resultType.session] = sessionDetailsAfterUpdateRsp.data[oThis.sessionKey];

    return responseHelper.successWithData(response);
  }
}

InstanceComposer.registerAsShadowableClass(AuthorizeSession, coreConstants.icNameSpace, 'AuthorizeSession');
