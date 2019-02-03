'use strict';

/**
 * Class to update status of device model.
 *
 * @module lib/device/updateStatus
 */

const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  DeviceConstant = require(rootPrefix + '/lib/globalConstant/device');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');

/**
 * Class to update device status.
 *
 * @class
 */
class UpdateDeviceStatus {
  /**
   * @param {Object} params
   * @param {Number} params.chainId
   * @param {Number} params.shardNumber
   * @param {String} params.userId  - uuid
   * @param {String} params.walletAddress
   * @param {String} params.status  - { REGISTERED, AUTHORIZING, AUTHORISING_FAILED, AUTHORIZED,
   * AUTHORIZED_FAILED, REVOKING, REVOKING_FAILED, REVOKED, REVOKED_FAILED}
   */
  constructor(params) {
    const oThis = this;
    oThis.userId = params.userId;
    oThis.status = params.status;
    oThis.chainId = params.chainId;
    oThis.shardNumber = params.shardNumber;
    oThis.walletAddress = params.walletAddress;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/device/updateStatus.js');

      return responseHelper.error({
        internal_error_identifier: 'l_d_us_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err.toString()
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    oThis._validateAndSanitize();

    await oThis._updateStatus();
  }

  /**
   * Validate and sanitize
   *
   * @return {Promise<*>}
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

    switch (oThis.status) {
      case DeviceConstant.failedStatusKinds.authorisingFailedStatus:
      case DeviceConstant.registeredStatus:
        oThis.status = DeviceConstant.registeredStatus;
        break;

      case DeviceConstant.failedStatusKinds.authorisedFailedStatus:
      case DeviceConstant.authorisingStatus:
        oThis.status = DeviceConstant.authorisingStatus;
        break;

      case DeviceConstant.failedStatusKinds.revokingFailedStatus:
      case DeviceConstant.authorisedStatus:
        oThis.status = DeviceConstant.authorisedStatus;
        break;

      case DeviceConstant.failedStatusKinds.revokedFailedStatus:
      case DeviceConstant.revokingStatus:
        oThis.status = DeviceConstant.revokingStatus;
        break;

      case DeviceConstant.revokedStatus:
        break;

      default:
        return responseHelper.error({
          internal_error_identifier: 'l_d_us_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { status: oThis.status }
        });
    }

    let DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceModel = new DeviceModel({ chainId: oThis.chainId, shardNumber: oThis.shardNumber });

    return await deviceModel.updateStatus({
      userId: oThis.userId,
      walletAddress: oThis.walletAddress,
      status: oThis.status
    });
  }
}

InstanceComposer.registerAsShadowableClass(UpdateDeviceStatus, coreConstants.icNameSpace, 'UpdateDeviceStatus');

module.exports = {};
