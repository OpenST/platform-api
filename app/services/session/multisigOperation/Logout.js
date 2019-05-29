/**
 * Module to logout all sessions multi sig operation.
 *
 * @module app/services/session/multisigOperation/Logout
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  LogoutRouter = require(rootPrefix + '/lib/workflow/logoutSessions/Router'),
  Base = require(rootPrefix + '/app/services/session/multisigOperation/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/sharded/User');

/**
 * Class to logout all sessions multi sig operation.
 *
 * @class SessionsLogout
 */
class SessionsLogout extends Base {
  /**
   * Constructor to logout all sessions multi sig operation.
   *
   * @param {object} params
   * @param {object} params.raw_calldata
   * @param {string} params.raw_calldata.method: possible value logout
   * @param {array} params.raw_calldata.parameters
   * @param {array} params.token_shard_details
   *
   * @augments Base
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.rawCalldata = params.raw_calldata;

    oThis.formattedEntity = null;
  }

  /**
   * Sanitize service specific params.
   *
   * @sets oThis.rawCalldata
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
          internal_error_identifier: 'a_s_s_mo_l_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata'],
          debug_options: {}
        })
      );
    }

    const rawCallDataMethod = oThis.rawCalldata.method;

    if (rawCallDataMethod !== 'logout') {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_l_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_method'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Performs specific pre checks.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performSpecificPreChecks() {
    const oThis = this;

    if (oThis.userData.status !== tokenUserConstants.activatedStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_l_3',
          api_error_identifier: 'user_not_activated',
          debug_options: {}
        })
      );
    }

    if (oThis.userData.tokenHolderStatus !== tokenUserConstants.tokenHolderActiveStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_l_4',
          api_error_identifier: 'token_holder_not_active',
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

    await oThis._updateUserTokenHolderStatus();

    await oThis._startWorkflow();

    return responseHelper.successWithData({ [resultType.tokenHolder]: oThis.formattedEntity });
  }

  /**
   * Update user token holder statuses.
   *
   * @sets oThis.formattedEntity
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _updateUserTokenHolderStatus() {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModelObj = new UserModel({
        shardNumber: oThis.tokenShardDetails[shardConstant.userEntityKind]
      });

    const updateParams = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      tokenHolderStatus: tokenUserConstants.tokenHolderLoggingOutStatus
    };

    const response = await userModelObj.updateItem(updateParams, null, 'ALL_NEW');
    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_l_5',
          api_error_identifier: 'could_not_proceed',
          debug_options: {}
        })
      );
    }

    const updateQueryResponse = userModelObj._formatRowFromDynamo(response.data.Attributes);

    oThis.formattedEntity = userModelObj._sanitizeRowFromDynamo(updateQueryResponse);

    return responseHelper.successWithData();
  }

  /**
   * Start logout workflow.
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('**** Starting logout workflow ');

    const requestParams = {
        auxChainId: oThis._configStrategyObject.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
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
        multisigAddress: oThis.multisigProxyAddress,
        sessionShardNumber: oThis.userData.sessionShardNumber,
        userShardNumber: oThis.tokenShardDetails[shardConstant.userEntityKind],
        deviceNonce: oThis.nonce
      },
      logoutInitParams = {
        stepKind: workflowStepConstants.logoutSessionInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.logoutSession,
        requestParams: requestParams
      };

    const logoutObj = new LogoutRouter(logoutInitParams);

    return logoutObj.perform();
  }
}

InstanceComposer.registerAsShadowableClass(SessionsLogout, coreConstants.icNameSpace, 'SessionsLogout');
