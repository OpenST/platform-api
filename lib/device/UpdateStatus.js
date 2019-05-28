/**
 * Module to update status of device.
 *
 * @module lib/device/UpdateStatus
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/sharded/Device');

/**
 * Class to update status of device.
 *
 * @class UpdateDeviceStatus
 */
class UpdateDeviceStatus {
  /**
   * Constructor to update status of device.
   *
   * @param {object} params
   * @param {number} params.chainId
   * @param {number} params.shardNumber
   * @param {string} params.userId
   * @param {string} params.walletAddress
   * @param {string} params.initialStatus
   * @param {string} params.finalStatus  - { REGISTERED, AUTHORIZING, AUTHORISING_FAILED, AUTHORIZED,
   * AUTHORIZED_FAILED, REVOKING, REVOKING_FAILED, REVOKED, REVOKED_FAILED}
   */
  constructor(params) {
    const oThis = this;

    oThis.userId = params.userId;
    oThis.chainId = params.chainId;
    oThis.shardNumber = params.shardNumber;
    oThis.walletAddress = params.walletAddress;
    oThis.initialStatus = params.initialStatus;
    oThis.finalStatus = params.finalStatus;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    oThis._validateAndSanitize();

    return oThis._updateStatus();
  }

  /**
   * Validate and sanitize.
   *
   * @returns {*}
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    if (CommonValidator.validateUuidV4(oThis.userId) && CommonValidator.validateEthAddress(oThis.walletAddress)) {
      oThis.walletAddress = oThis.walletAddress.toLowerCase();
      oThis.userId = oThis.userId.toLowerCase();
    } else {
      return responseHelper.error({
        internal_error_identifier: 'l_d_us_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {
          userId: oThis.userId,
          walletAddress: oThis.walletAddress
        }
      });
    }
  }

  /**
   * Updates status of device.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _updateStatus() {
    const oThis = this;

    const DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceModel = new DeviceModel({ shardNumber: oThis.shardNumber }),
      deviceUpdateResponse = await deviceModel.updateStatusFromInitialToFinal(
        oThis.userId,
        oThis.walletAddress,
        oThis.initialStatus,
        oThis.finalStatus
      );

    if (deviceUpdateResponse.isFailure()) {
      logger.error('==== Error', deviceUpdateResponse.toHash());

      return responseHelper.error({
        internal_error_identifier: 'l_d_us_3',
        api_error_identifier: 'device_status_update_failed',
        debug_options: { initialStatus: oThis.initialStatus, finalStatus: oThis.finalStatus }
      });
    }

    return deviceUpdateResponse;
  }
}

InstanceComposer.registerAsShadowableClass(UpdateDeviceStatus, coreConstants.icNameSpace, 'UpdateDeviceStatus');

module.exports = {};
