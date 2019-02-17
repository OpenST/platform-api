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
require(rootPrefix + '/app/models/ddb/sharded/Device');

class MultisigOpertationBaseKlass extends ServiceBase {
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.userData = params.user_data;
    oThis.userId = params.user_data.userId;
    oThis.deviceShardNumber = params.user_data.deviceShardNumber;

    oThis.deviceAddress = params.raw_calldata['parameters'][0];

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
    oThis.multisigAddress = params.user_data.multisigAddress;
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
    oThis.to = basicHelper.sanitizeAddress(oThis.to);
    oThis.signer = basicHelper.sanitizeAddress(oThis.signer);
    oThis.refundReceiver = basicHelper.sanitizeAddress(oThis.refundReceiver);
    oThis.multisigAddress = basicHelper.sanitizeAddress(oThis.multisigAddress);
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
          internal_error_identifier: 'a_s_dm_mo_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

    if (oThis.multisigAddress !== oThis.to) {
      logger.error('Multisig address mismatch');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_mo_b_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: ''
        })
      );
    }

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
          internal_error_identifier: 'a_s_dm_mo_b_3',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData(deviceDetails);
  }

  /**
   * Checks if the device status is same as the passed parameter
   *
   * @param {String}deviceStatus
   * @returns {Promise<never>}
   * @private
   */
  async _checkDeviceStatus(deviceStatus) {
    const oThis = this;

    let deviceDetailsRsp = await oThis._fetchDeviceDetails(),
      deviceDetails = deviceDetailsRsp.data;

    if (deviceDetails.status !== deviceStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_mo_b_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: { deviceStatus: deviceDetails.status }
        })
      );
    }
  }

  /**
   * This function updates the device status of the respective record in devices table.
   *
   * @param {String}fromDeviceStatus:
   * @param {String}toDeviceStatus: Update the record with given device status
   * @returns {Promise<*>}
   * @private
   */
  async _updateDeviceStatus(initialDeviceStatus, finalDeviceStatus) {
    const oThis = this;

    let paramsToUpdateDeviceStatus = {
      chainId: oThis._configStrategyObject.auxChainId,
      userId: oThis.userId,
      finalStatus: finalDeviceStatus,
      initialStatus: initialDeviceStatus,
      shardNumber: oThis.deviceShardNumber,
      walletAddress: oThis.deviceAddress
    };
    let UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus),
      updateDeviceStatusRsp = await updateDeviceStatusObj.perform();

    if (updateDeviceStatusRsp.isFailure()) {
      return Promise.reject(updateDeviceStatusRsp);
    }

    return updateDeviceStatusRsp;
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

  async _performOperation() {
    throw 'sub-class to implement';
  }
}

module.exports = MultisigOpertationBaseKlass;
