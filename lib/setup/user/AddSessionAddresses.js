'use strict';
/**
 * Add session addresses.
 *
 * @module lib/setup/user/AddSessionAddresses
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2);

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class to add session addresses for user.
 *
 * @class
 */
class AddSessionAddresses {
  /**
   * Constructor to add session addresses for user.
   *
   * @param {Object} params
   * @param {String/Number} params.tokenId
   * @param {String} params.userId
   * @param {Array<String>} params.sessionAddresses
   * @param {Number} params.sessionExpiration
   * @param {Number} params.sessionSpendingLimit
   * @param {Array<Number>} [params.knownAddressIds]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.inputParams = params;

    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
    oThis.sessionAddresses = params.sessionAddresses;
    oThis.expirationHeight = params.sessionExpiration;
    oThis.spendingLimit = params.sessionSpendingLimit;
    oThis.sessionStatus = sessionConstants.initializingStatus;
    oThis.knownAddressIds = params.knownAddressIds;

    oThis.userShardNumber = null;
    oThis.sessionShardNumber = null;
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    oThis._validateAndSanitize();

    await oThis._fetchSessionShardNumber();

    await oThis._addSessionAddresses();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @return {Promise}
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this,
      mandatoryParams = ['userId', 'sessionAddresses', 'expirationHeight', 'spendingLimit', 'tokenId'];

    let isMissingParameters = false;
    for (let i = 0; i < mandatoryParams.length; i++) {
      if (!oThis.hasOwnProperty(mandatoryParams[i])) {
        logger.error('Mandatory parameter ', mandatoryParams[i], ' is missing.');
        isMissingParameters = true;
      }
    }

    if (isMissingParameters) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_u_asa_1',
          api_error_identifier: 'invalid_params',
          debug_options: {}
        })
      );
    }

    let paramErrors = [];

    if (!CommonValidators.validateUuidV4(oThis.userId)) {
      paramErrors.push('invalid_user_id');
    } else {
      oThis.userId = oThis.userId.toLowerCase();
    }

    if (!CommonValidators.validateEthAddressArray(oThis.sessionAddresses)) {
      paramErrors.push('invalid_session_addresses');
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.expirationHeight)) {
      paramErrors.push('invalid_expiration_height');
    }

    if (!CommonValidators.validateNonZeroWeiValue(oThis.spendingLimit)) {
      paramErrors.push('invalid_spending_limit');
    }

    if (oThis.knownAddressIds) {
      if (!CommonValidators.validateNonZeroIntegerArray(oThis.knownAddressIds)) {
        paramErrors.push('invalid_known_address_ids');
      }
      if (oThis.knownAddressIds.length !== oThis.sessionAddresses.length) {
        paramErrors.push('invalid_known_address_ids');
      }
    }

    if (paramErrors.length > 0) {
      return oThis._validationError('l_s_u_asa_2', paramErrors);
    }
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<String>}
   *
   * @private
   */
  async _fetchSessionShardNumber() {
    const oThis = this,
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId],
        consistentRead: 1 //NOTE: As this user was created just a while ago it is important for consistent read here.
      });

    let response = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(response.data[oThis.userId])) {
      return oThis._validationError('l_s_u_asa_3', ['invalid_user_id']);
    }

    let availableShards = response.data[oThis.userId];

    if (!availableShards.sessionShardNumber) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_u_asa_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: { availableShards: availableShards }
        })
      );
    }

    oThis.sessionShardNumber = availableShards.sessionShardNumber;
  }

  /**
   * Add session addresses in session table.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _addSessionAddresses() {
    const oThis = this,
      SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionModel = new SessionModel({
        shardNumber: oThis.sessionShardNumber
      });

    // Creating insertion parameters. Created a common hash for all the common parameters. Reduces memory usage.
    let insertParams = [],
      buffer;
    for (let index = 0; index < oThis.sessionAddresses.length; index++) {
      buffer = {
        userId: oThis.userId,
        expirationHeight: oThis.expirationHeight,
        spendingLimit: oThis.spendingLimit,
        status: oThis.sessionStatus,
        address: oThis.sessionAddresses[index],
        updatedTimestamp: Math.floor(new Date().getTime() / 1000)
      };
      if (oThis.knownAddressIds) {
        buffer.knownAddressId = oThis.knownAddressIds[index];
      }
      insertParams.push(buffer);
    }

    await sessionModel.batchWriteItem(insertParams).catch(function(err) {
      logger.error('==== Error', err);

      if (responseHelper.isCustomResult(error)) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: error.internalErrorCode,
            api_error_identifier: 'add_session_failed',
            debug_options: { insertParams: insertParams, err: err }
          })
        );
      } else {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_s_u_asa_5',
            api_error_identifier: 'add_session_failed',
            debug_options: { insertParams: insertParams, err: err }
          })
        );
      }
    });

    logger.debug('Done with inserting session addresses.');
  }

  /**
   * Validation errors
   *
   * @param {String} code
   * @param {Array} paramErrors
   *
   * @return {Promise}
   */
  _validationError(code, paramErrors) {
    const oThis = this;
    return Promise.reject(
      responseHelper.paramValidationError({
        internal_error_identifier: code,
        api_error_identifier: 'invalid_params',
        params_error_identifiers: paramErrors,
        error_config: errorConfig,
        debug_options: {
          inputParams: oThis.inputParams
        }
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(AddSessionAddresses, coreConstants.icNameSpace, 'AddSessionAddresses');

module.exports = {};
