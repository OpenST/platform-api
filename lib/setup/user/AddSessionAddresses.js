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
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2);

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

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
   * @param {String} params.userId
   * @param {Number/String} params.clientId
   * @param {Array<String>} params.sessionAddresses
   * @param {Number} params.expirationHeight
   * @param {Number} params.spendingLimit
   * @param {String} params.status
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.inputParams = params;

    oThis.clientId = params.clientId;
    oThis.userId = params.userId;
    oThis.sessionAddresses = params.sessionAddresses;
    oThis.expirationHeight = params.expirationHeight;
    oThis.spendingLimit = params.spendingLimit;
    oThis.sessionStatus = params.status || sessionConstants.initializingStatus;

    oThis.userShardNumber = null;
    oThis.sessionShardNumber = null;
    oThis.unProcessedTransactions = [];
  }

  /**
   * Perform
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/user/AddSessionAddresses.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_u_asa_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async performer.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._validateAndSanitize();

    await oThis._fetchTokenDetails();

    await oThis._fetchTokenUsersShards();

    await oThis._fetchSessionShardNumber();

    await oThis._addSessionAddresses();
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
      mandatoryParams = ['userId', 'sessionAddresses', 'expirationHeight', 'spendingLimit', 'clientId'];

    let isMissingParameters = false;
    for (let i = 0; i < mandatoryParams.length; i++) {
      if (!oThis.hasOwnProperty(mandatoryParams[i])) {
        logger.error('Mandatory parameter ', mandatoryParams[i], ' is missing.');
        isMissingParameters = true;
      }
    }

    if (isMissingParameters) {
      return oThis._validationError('l_s_u_asa_2');
    }

    let paramErrors = [];

    if (!CommonValidators.validateUuidV4(oThis.userId)) {
      paramErrors.push('invalid_user_id');
    } else {
      oThis.userId = oThis.userId.toLowerCase();
    }

    if (!CommonValidators.validateArray(oThis.sessionAddresses)) {
      paramErrors.push('invalid_session_addresses');
    }

    for (let index = 0; index < oThis.sessionAddresses.length; index++) {
      if (!CommonValidators.validateEthAddress(oThis.sessionAddresses[index])) {
        paramErrors.push('invalid_session_address');
      }
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
   * Fetch token details: fetch token details from cache
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    let tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    let response = await tokenCache.fetch();
    if (!response.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_u_asa_3',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    oThis.tokenId = response.data.id;
  }

  /**
   * Fetch token user shards: Fetch token user shards from cache.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenUsersShards() {
    const oThis = this,
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardNumbersCache = new TokenShardNumbersCache({
        tokenId: oThis.tokenId
      });

    let response = await tokenShardNumbersCache.fetch();

    oThis.userShardNumber = response.data.user;
  }

  /**
   * Fetch session shard number for a given user Id.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchSessionShardNumber() {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModel = new UserModel({
        shardNumber: oThis.userShardNumber
      });

    let userResponse = await userModel.getUsersByIds({
      tokenId: oThis.tokenId,
      userIds: [oThis.userId]
    });

    if (userResponse.isFailure()) {
      logger.error('Could not fetch user details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_u_asa_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    if (!userResponse.data[oThis.userId]) {
      logger.error('Invalid user address.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_u_asa_5',
          api_error_identifier: 'invalid_user_id',
          debug_options: {}
        })
      );
    }

    oThis.sessionShardNumber = userResponse.data[oThis.userId].sessionShardNumber;
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

    let insertParams = [],
      promiseArray = [];
    for (let index = 0; index < oThis.sessionAddresses.length; index++) {
      let rowData = {
        userId: oThis.userId,
        address: oThis.sessionAddresses[index],
        expirationHeight: oThis.expirationHeight,
        spendingLimit: oThis.spendingLimit,
        status: sessionConstants.invertedSessionStatuses[oThis.sessionStatus],
        updatedTimestamp: Math.floor(new Date().getTime() / 1000)
      };
      insertParams.push(rowData);
    }

    promiseArray.push(
      new Promise(function(onResolve, onReject) {
        sessionModel
          .batchWriteItem(insertParams)
          .then(function(response) {
            if (!response || response.isFailure()) {
              for (let index in insertParams) {
                oThis.unProcessedTransactions.push(insertParams[index].address);
              }
            }
            onResolve();
          })
          .catch(function(err) {
            logger.error('Transactions Batch Insert in Catch block ---- ', err);
            for (let index in insertParams) {
              oThis.unProcessedTransactions.push(insertParams[index].address);
            }
            onResolve();
          });
      })
    );

    logger.debug('Done with inserting session addresses.');

    return Promise.all(promiseArray);
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

module.exports = AddSessionAddresses;
