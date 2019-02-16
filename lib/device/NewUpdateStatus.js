'use strict';
/**
 * Class to update status of device model.
 *
 * @module lib/device/NewUpdateStatus
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device');

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
   * performer.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    oThis._validateAndSanitize();

    return oThis._updateStatus();
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
      case deviceConstants.failedStatusKinds.authorisingFailedStatus:
      case deviceConstants.registeredStatus:
        oThis.status = deviceConstants.registeredStatus;
        break;

      case deviceConstants.failedStatusKinds.authorisedFailedStatus:
      case deviceConstants.authorisingStatus:
        oThis.status = deviceConstants.authorisingStatus;
        break;

      case deviceConstants.failedStatusKinds.revokingFailedStatus:
      case deviceConstants.authorisedStatus:
        oThis.status = deviceConstants.authorisedStatus;
        break;

      case deviceConstants.failedStatusKinds.revokedFailedStatus:
      case deviceConstants.revokingStatus:
        oThis.status = deviceConstants.revokingStatus;
        break;

      case deviceConstants.revokedStatus:
        break;

      default:
        return responseHelper.error({
          internal_error_identifier: 'l_d_us_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { status: oThis.status }
        });
    }

    let DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceModel = new DeviceModel({ shardNumber: oThis.shardNumber });

    return deviceModel.updateStatus({
      userId: oThis.userId,
      walletAddress: oThis.walletAddress,
      status: oThis.status
    });
  }
}

InstanceComposer.registerAsShadowableClass(UpdateDeviceStatus, coreConstants.icNameSpace, 'UpdateDeviceStatus');

module.exports = {};
