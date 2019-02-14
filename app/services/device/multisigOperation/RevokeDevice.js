'use strict';

/**
 *  Revoke device
 *
 * @module app/services/deviceManager/multisigOperation/RevokeDevice
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/app/services/deviceManager/multisigOperation/Base'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/updateStatus');

class RevokeDevice extends Base {
  constructor(params) {
    super(params);
  }

  /**
   *
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    //Perform all the custom checks related to authorize device
    await oThis._fetchAndCheckDeviceStatus();

    await oThis._updateDeviceStatus();

    await oThis._startWorkflow();
  }

  /**
   * Fetches the device details present in the database.
   *
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAndCheckDeviceStatus() {
    await super._fetchAndCheckDeviceStatus(deviceConstants.authorisedStatus);

    return Promise.resolve(responseHelper.successWithData({}));
  }

  async _updateDeviceStatus() {
    await super._updateDeviceStatus(deviceConstants.revokingStatus);

    return Promise.resolve(responseHelper.successWithData({}));
  }

  async _startWorkflow() {
    const oThis = this;
    //Todo: Start the workflow from here
  }
}

InstanceComposer.registerAsShadowableClass(RevokeDevice, coreConstants.icNameSpace, 'RevokeDevice');
