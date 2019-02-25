'use strict';
/**
 * This class file verifies if the revoke device transaction was done successfully.
 *
 * @module lib/device/VerifyRevoke
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  GetTxEvent = require(rootPrefix + '/lib/transactions/GetTxEvent'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/lib/device/UpdateStatus');

/**
 * Class for VerifyRevoke.
 *
 * @class
 */
class VerifyRevoke {
  /**
   *
   * @param {Object} params
   * @param {String} params.userId
   * @param {String/Number} params.chainId
   * @param {String} params.transactionHash
   * @param {Number} params.deviceShardNumber
   * @param {String} params.deviceAddressToRemove
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.userId = params.userId;
    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
    oThis.deviceShardNumber = params.deviceShardNumber;
    oThis.deviceAddressToRemove = params.deviceAddressToRemove;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    let eventsData = await oThis._fetchContractEventsData();

    if (eventsData.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    let eventsCheckResponse = await oThis._checkEventsData(eventsData.data);

    if (eventsCheckResponse.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    await oThis._markRevokedInDevicesTable();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  /**
   * This function fetches events data.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchContractEventsData() {
    const oThis = this;
    let paramsForGetTxEvent = {
      chainId: oThis.chainId,
      transactionHash: oThis.transactionHash,
      contractNames: ['GnosisSafe'],
      eventNamesMap: { RemovedOwner: 1 }
    };
    let GetTxEvent = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTxEvent'),
      getTxEventObj = new GetTxEvent(paramsForGetTxEvent),
      eventsRsp = await getTxEventObj.perform();

    if (eventsRsp.isFailure()) {
      logger.error('Error in reading events');
      return eventsRsp;
    }

    let eventsData = eventsRsp.data;

    if (basicHelper.isEmptyObject(eventsData)) {
      logger.error('Events data is empty');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_d_vr_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return eventsRsp;
  }

  /**
   * This function checks if 'AddedOwner' event is present in events data passed.
   *
   * @param eventsData
   * @returns {Promise<never>}
   * @private
   */
  async _checkEventsData(eventsData) {
    const oThis = this;

    if (!eventsData.hasOwnProperty('RemovedOwner')) {
      logger.error('Transaction not successful');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_d_vr_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * Mark the device authorized.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _markRevokedInDevicesTable() {
    const oThis = this;

    let paramsToUpdateDeviceStatus = {
      chainId: oThis.chainId,
      userId: oThis.userId,
      initialStatus: deviceConstants.revokingStatus,
      finalStatus: deviceConstants.revokedStatus,
      shardNumber: oThis.deviceShardNumber,
      walletAddress: oThis.deviceAddressToRemove
    };
    let UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus);

    return updateDeviceStatusObj.perform();
  }
}

InstanceComposer.registerAsShadowableClass(VerifyRevoke, coreConstants.icNameSpace, 'VerifyRevokeDeviceTransaction');
module.exports = VerifyRevoke;
