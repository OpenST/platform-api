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
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/UpdateStatus');

class MultisigOpertationBaseKlass extends ServiceBase {
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.userData = params.user_data;
    oThis.userId = params.user_data.userId;
    oThis.devicesShardNumber = params.user_data.deviceShardNumber;

    oThis.deviceAddress = params.raw_calldata['parameters'][0]; //Todo: Fetch proper address. Clarification needed

    oThis.tokenUserDetails = null;
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

    oThis.deviceAddress = basicHelper.sanitizeAddress(oThis.deviceAddress);
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

    // TODO - remove the cache hit
    let tokenUserDetails = await oThis._getUserDetailsFromDdb();

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
          internal_error_identifier: 'a_s_dm_mo_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    oThis.tokenUserDetails = tokenUserDetails;

    return responseHelper.successWithData({});
  }

  /**
   * Fetch the device data and checks if the device status is same as given parameter
   *
   *
   * @returns {Promise<>}
   */
  async _fetchDeviceDetails() {
    const oThis = this;

    let paramsForDeviceDetailsCache = {
      userId: oThis.userId,
      walletAddresses: [oThis.deviceAddress],
      tokenId: oThis.tokenId
    };

    let DeviceDetailsKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailsObj = new DeviceDetailsKlass(paramsForDeviceDetailsCache),
      deviceDetailsRsp = await deviceDetailsObj.fetch();

    if (deviceDetailsRsp.isFailure()) {
      logger.error('No data found for the provided wallet address');
      return Promise.reject(deviceDetailsRsp);
    }

    let deviceDetails = deviceDetailsRsp.data[oThis.deviceAddress];

    if (basicHelper.isEmptyObject(deviceDetails)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_mo_ad_2',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData(deviceDetails);
  }

  async _checkDeviceStatus(deviceStatus) {
    const oThis = this;

    let deviceDetailsRsp = await oThis._fetchDeviceDetails(),
      deviceDetails = deviceDetailsRsp.data;

    if (deviceDetails.status !== deviceStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_mo_ad_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { deviceStatus: deviceDetails.status }
        })
      );
    }
  }

  /**
   * This function updates the device status of the respective record in devices table.
   *
   * @param {String}deviceStatus: Update the record with given device status
   * @returns {Promise<*>}
   * @private
   */
  async _updateDeviceStatus(deviceStatus) {
    const oThis = this;

    let paramsToUpdateDeviceStatus = {
      chainId: oThis._configStrategyObject.auxChainId,
      userId: oThis.userId,
      status: deviceStatus,
      shardNumber: oThis.tokenUserDetails.deviceShardNumber,
      walletAddress: oThis.deviceAddress
    };
    let UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus),
      updateDeviceStatusRsp = await updateDeviceStatusObj.perform();

    if (updateDeviceStatusRsp.isFailure()) {
      return Promise.reject(updateDeviceStatusRsp);
    }

    return responseHelper.successWithData({});
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
          internal_error_identifier: 'a_s_dm_mo_b_1',
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

  async performOperation() {
    throw 'sub-class to implement';
  }

  _performOperation() {
    throw 'sub-class to implement';
  }
}

module.exports = MultisigOpertationBaseKlass;
