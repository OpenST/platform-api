/**
 * Module to authorize session multi sig operation.
 *
 * @module app/services/session/multisigOperation/AuthorizeSession
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ChainDetails = require(rootPrefix + '/app/services/chain/Get'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  Base = require(rootPrefix + '/app/services/session/multisigOperation/Base'),
  AuthorizeSessionRouter = require(rootPrefix + '/lib/workflow/authorizeSession/Router'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');

/**
 * Class to authorize session multi sig operation.
 *
 * @class AuthorizeSession
 */
class AuthorizeSession extends Base {
  /**
   * Constructor to authorize session multi sig operation.
   *
   * @param {object} params
   * @param {array} params.token_shard_details
   * @param {object} params.raw_calldata:
   * @param {string} params.raw_calldata.method: possible value authorizeSession
   * @param {array} params.raw_calldata.parameters
   * @param {string} params.raw_calldata.parameters[0]: new session address
   * @param {string} params.raw_calldata.parameters[1]: spending limit in wei
   * @param {string/number} params.raw_calldata.parameters[2]: expiration height
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
    oThis.spendingLimit = null;
    oThis.expirationHeight = null;
  }

  /**
   * Sanitize service specific params.
   *
   * @sets oThis.sessionKey, oThis.spendingLimit, oThis.expirationHeight
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
          internal_error_identifier: 'a_s_s_mo_as_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata'],
          debug_options: {}
        })
      );
    }

    const rawCallDataMethod = oThis.rawCalldata.method;
    if (rawCallDataMethod !== 'authorizeSession') {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_as_2',
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
          internal_error_identifier: 'a_s_s_mo_as_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_address'],
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroWeiValue(rawCallDataParameters[1])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_as_4',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_spending_limit'],
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(rawCallDataParameters[2])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_as_5',
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
   * Performs specific pre checks.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performSpecificPreChecks() {
    const oThis = this;

    // If session is logging out then don't allow authorizing new session.
    if (oThis.userData.tokenHolderStatus === tokenUserConstants.tokenHolderLoggingOutStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_as_6',
          api_error_identifier: 'token_holder_not_active',
          debug_options: {}
        })
      );
    }

    const chainDetailsObj = new ChainDetails({ chain_id: oThis._configStrategyObject.auxChainId }),
      chainDetailsRsp = await chainDetailsObj.perform();

    if (chainDetailsRsp.isFailure()) {
      return Promise.reject(chainDetailsRsp);
    }

    const blockHeight = chainDetailsRsp.data.chain.blockHeight;

    if (oThis.expirationHeight < blockHeight + coreConstants.BUFFER_BLOCK_HEIGHT) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_mo_as_7',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_expiration_height'],
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

    await oThis._addEntryInSessionsTable();

    await oThis._startWorkflow();

    await oThis._sendPreprocessorWebhook(webhookSubscriptionsConstants.sessionsAuthorizationInitiateTopic);

    return oThis._prepareResponseEntity();
  }

  /**
   * Adds an entry in sessions table.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _addEntryInSessionsTable() {
    const oThis = this;
    logger.debug('****Creating entry in sessions table');

    const paramsForAddSessions = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      sessionAddresses: [oThis.sessionKey],
      sessionExpiration: oThis.expirationHeight,
      sessionSpendingLimit: oThis.spendingLimit
    };
    const AddSessionsAddressKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddSessionAddresses'),
      addSessionsAddressObj = new AddSessionsAddressKlass(paramsForAddSessions);

    await addSessionsAddressObj.perform();

    return responseHelper.successWithData({});
  }

  /**
   * Starts the workflow to submit authorize device transaction.
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the authorize session workflow ');

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
      authorizeSessionInitParams = {
        stepKind: workflowStepConstants.authorizeSessionInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.authorizeSession,
        requestParams: requestParams
      };

    const authorizeSessionObj = new AuthorizeSessionRouter(authorizeSessionInitParams);

    return authorizeSessionObj.perform();
  }

  /**
   * Prepares the response for authorize session service.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _prepareResponseEntity() {
    const oThis = this;

    logger.debug('****Preparing authorize session service response');
    const sessionDetailsAfterUpdateRsp = await super._fetchSessionDetails(oThis.sessionKey),
      response = {};

    response[resultType.session] = sessionDetailsAfterUpdateRsp.data[oThis.sessionKey];

    return responseHelper.successWithData(response);
  }
}

InstanceComposer.registerAsShadowableClass(AuthorizeSession, coreConstants.icNameSpace, 'AuthorizeSession');

module.exports = {};
