'use strict';
/**
 * Add session addresses.
 *
 * @module lib/setup/user/AddSessionAddresses
 */
const OSTBase = require('@openstfoundation/openst-base'),
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
   * @param {String} params.status
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

    if (!CommonValidators.validateString(oThis.expirationHeight)) {
      paramErrors.push('invalid_expiration_height');
    }

    if (!CommonValidators.validateInteger(oThis.spendingLimit)) {
      paramErrors.push('invalid_spending_limit');
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
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] });

    let response = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(response.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_u_asa_3',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_user_id'],
          debug_options: {}
        })
      );
    }
    response = response.data[oThis.userId];

    oThis.sessionShardNumber = response.sessionShardNumber;
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
    let insertParams = [];
    for (let index = 0; index < oThis.sessionAddresses.length; index++) {
      insertParams.push({
        userId: oThis.userId,
        expirationHeight: oThis.expirationHeight,
        spendingLimit: oThis.spendingLimit,
        status: oThis.sessionStatus,
        address: oThis.sessionAddresses[index],
        updatedTimestamp: Math.floor(new Date().getTime() / 1000)
      });
    }

    await sessionModel.batchWriteItem(insertParams);

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
