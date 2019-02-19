'use strict';

/**
 *  Base for device related multi sig operations
 *
 * @module app/services/device/getList/Base
 */

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

class MultisigSessionsOpertationBaseKlass extends ServiceBase {
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.userData = params.user_data;
    oThis.userId = params.user_data.userId;
    oThis.sessionKey = params.raw_calldata['parameters'][0];
    oThis.sessionShardNumber = params.user_data.sessionShardNumber;
    oThis.multisigProxyAddress = params.user_data.multisigAddress;
    oThis.tokenHolderProxyAddress = params.user_data.tokenHolderAddress;

    oThis.to = params.to;
    oThis.value = params.value;
    oThis.calldata = params.calldata;
    oThis.rawCalldata = params.raw_calldata;
    oThis.operation = params.operation;
    oThis.safeTxGas = params.safe_tx_gas;
    oThis.dataGas = params.data_gas;
    oThis.gasPrice = params.gas_price;
    oThis.gasToken = params.gas_token;
    oThis.refundReceiver = params.refund_receiver;
    oThis.signature = params.signatures;
    oThis.signer = params.signer;
  }

  async _asyncPerform() {
    const oThis = this;

    await oThis._sanitizeParams();

    await oThis._performCommonPreChecks();

    return oThis._performOperation();
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sanitizeParams() {
    const oThis = this;

    oThis.sessionKey = basicHelper.sanitizeAddress(oThis.sessionKey);
    oThis.to = basicHelper.sanitizeAddress(oThis.to);
    oThis.signer = basicHelper.sanitizeAddress(oThis.signer);
    oThis.refundReceiver = basicHelper.sanitizeAddress(oThis.refundReceiver);
  }

  /**
   * 1. status is activated in users table
   * 2. multisig is present for that user
   * 3. token holder is present for that user
   * 4. Kind is user only
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performCommonPreChecks() {
    const oThis = this;

    let tokenUserDetails = oThis.userData;

    //Check if user is activated
    if (
      tokenUserDetails.status !== tokenUserConstants.activatedStatus ||
      !tokenUserDetails.multisigAddress ||
      !tokenUserDetails.tokenHolderAddress ||
      tokenUserDetails.kind !== tokenUserConstants.userKind
    ) {
      logger.error('Token user is not set properly');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    if (tokenUserDetails.tokenHolderAddress !== oThis.to) {
      logger.error('Tokenholder address mismatch');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_b_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Fetch the device data and checks if the device status is same as given parameter
   *
   *
   * @returns {Promise<>}
   */
  async _fetchSessionDetails() {
    const oThis = this;

    let paramsForSessionsDetailsCache = {
      userId: oThis.userId,
      addresses: [oThis.sessionKey],
      tokenId: oThis.tokenId
    };

    let SessionDetailsKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionDetailsObj = new SessionDetailsKlass(paramsForSessionsDetailsCache),
      sessionDetailsRsp = await sessionDetailsObj.fetch();

    if (sessionDetailsRsp.isFailure()) {
      logger.error('No data found for the provided sessionkey');
      return Promise.reject(sessionDetailsRsp);
    }

    let sessionDetails = sessionDetailsRsp.data[oThis.sessionKey];

    if (basicHelper.isEmptyObject(sessionDetails)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_b_3',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData(sessionDetails));
  }

  /**
   * Get user device managers details for given token id.
   *
   * @return {Promise<*|result>}
   */
  async _getUserDetailsFromDdb() {
    const oThis = this;

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    let tokenUserDetailsCache = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCache.fetch();

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('token user details were not fetched.');
      Promise.reject(tokenUserDetailsCacheRsp);
    }

    let tokenDetails = tokenUserDetailsCacheRsp.data[oThis.userId];

    if (!CommonValidators.validateObject(tokenDetails)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_s_mo_b_4',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(tokenDetails);
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }

  async _performOperation() {
    throw 'sub-class to implement';
  }
}

module.exports = MultisigSessionsOpertationBaseKlass;
