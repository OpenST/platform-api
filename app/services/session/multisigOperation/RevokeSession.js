/**
 * Module to revoke session multi sig operation.
 *
 * @module app/services/session/multisigOperation/RevokeSession
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  Base = require(rootPrefix + '/app/services/session/multisigOperation/Base'),
  RevokeSessionRouter = require(rootPrefix + '/lib/workflow/revokeSession/Router'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');
require(rootPrefix + '/app/models/ddb/sharded/Session.js');

/**
 * Class to revoke session multi sig operation.
 *
 * @class RevokeSession
 */
class RevokeSession extends Base {
  /**
   * Constructor to revoke session multi sig operation.
   *
   * @param {object} params
   * @param {array} params.token_shard_details
   * @param {object} params.raw_calldata
   * @param {string} params.raw_calldata.method: possible value revokeSession
   * @param {array} params.raw_calldata.parameters
   * @param {string} params.raw_calldata.parameters[0]: session address to be revoked
   *
   * @augments Base
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.rawCalldata = params.raw_calldata;
    oThis.sessionKey = null;
  }

  /**
   * Sanitize service specific params.
   *
   * @sets oThis.sessionKey
   *
   * @returns {Promise<Promise<never>|undefined>}
   * @private
   */
  async _sanitizeSpecificParams() {
    const oThis = this;

    oThis.rawCalldata = await basicHelper.sanitizeRawCallData(oThis.rawCalldata);
    if (!CommonValidators.validateRawCallData(oThis.rawCalldata)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_rs_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata'],
          debug_options: {}
        })
      );
    }

    const rawCallDataMethod = oThis.rawCalldata.method;
    if (rawCallDataMethod !== 'revokeSession') {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_rs_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_method'],
          debug_options: {}
        })
      );
    }

    const rawCallDataParameters = oThis.rawCalldata.parameters;
    if (!(rawCallDataParameters instanceof Array) || !CommonValidators.validateEthAddress(rawCallDataParameters[0])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_rs_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_address'],
          debug_options: {}
        })
      );
    }

    oThis.sessionKey = basicHelper.sanitizeAddress(rawCallDataParameters[0]);
  }

  /**
   * Performs specific pre checks.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performSpecificPreChecks() {
    const oThis = this;

    if (oThis.userData.tokenHolderStatus !== tokenUserConstants.tokenHolderActiveStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_rs_5',
          api_error_identifier: 'token_holder_not_active',
          debug_options: {}
        })
      );
    }

    const sessionDetailsRsp = await super._fetchSessionDetails(oThis.sessionKey),
      sessionDetails = sessionDetailsRsp.data[oThis.sessionKey];

    if (!sessionDetails || sessionDetails.status !== sessionConstants.authorizedStatus) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_rs_5',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_session_address'],
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * Perform operation.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    const updateResponse = await oThis._updateEntryInSessionsTable();

    await oThis._startWorkflow();

    return oThis._prepareResponseEntity(updateResponse);
  }

  /**
   * Updates entry in sessions table.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _updateEntryInSessionsTable() {
    const oThis = this;
    logger.debug('****Updating entry in sessions table');

    const SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionModelObj = new SessionModel({ shardNumber: oThis.sessionShardNumber }),
      updateResponse = await sessionModelObj.updateStatusFromInitialToFinal(
        oThis.userId,
        oThis.sessionKey,
        sessionConstants.authorizedStatus,
        sessionConstants.revokingStatus
      );

    if (updateResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_rs_6',
          api_error_identifier: 'could_not_proceed',
          debug_options: {}
        })
      );
    }

    return updateResponse;
  }

  /**
   * Starts the workflow to submit authorize device transaction.
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the revoke session workflow ');
    const requestParams = {
        auxChainId: oThis._configStrategyObject.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        clientId: oThis.clientId,
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
        multisigAddress: oThis.multisigProxyAddress,
        userShardNumber: oThis.tokenShardDetails[shardConstant.userEntityKind],
        deviceNonce: oThis.nonce
      },
      revokeSessionInitParams = {
        stepKind: workflowStepConstants.revokeSessionInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.revokeSession,
        requestParams: requestParams
      };

    const revokeSessionObj = new RevokeSessionRouter(revokeSessionInitParams);

    return revokeSessionObj.perform();
  }

  /**
   * Prepares the response for revoke session service.
   *
   * @param {object} updateResponse
   *
   * @returns {*|result}
   * @private
   */
  _prepareResponseEntity(updateResponse) {
    logger.debug('****Preparing revoke session service response');

    const response = {};
    response[resultType.session] = updateResponse.data;

    return responseHelper.successWithData(response);
  }
}

InstanceComposer.registerAsShadowableClass(RevokeSession, coreConstants.icNameSpace, 'RevokeSession');
