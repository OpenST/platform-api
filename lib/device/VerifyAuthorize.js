'use strict';
/**
 * This class file verifies if the authorize transaction was done successfully.
 *
 * @module lib/device/VerifyAuthorize
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GetTxEvent = require(rootPrefix + '/lib/transactions/GetTxEvent'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/lib/device/UpdateStatus');

/**
 * Class for VerifyAuthorize.
 *
 * @class
 */
class VerifyAuthorize {
  /**
   *
   * @param {Object} params
   * @param {String} params.userId
   * @param {String/Number} params.chainId
   * @param {String} params.deviceAddress
   * @param {String} params.transactionHash
   * @param {Number} params.deviceShardNumber
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.userId = params.userId;
    oThis.chainId = params.chainId;
    oThis.deviceAddress = params.deviceAddress;
    oThis.transactionHash = params.transactionHash;
    oThis.deviceShardNumber = params.deviceShardNumber;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    const eventsData = await oThis._fetchContractEventsData();

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

    await oThis._markAuthorizedInDevicesTable();

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
        eventNamesMap: { AddedOwner: 1 }
      },
      GetTxEvent = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTxEvent'),
      getTxEventObj = new GetTxEvent(paramsForGetTxEvent),
      eventsRsp = await getTxEventObj.perform();

    if (eventsRsp.isFailure()) {
      logger.error('Error in reading events');
      return eventsRsp;
    }

    const eventsData = eventsRsp.data;

    if (basicHelper.isEmptyObject(eventsData)) {
      logger.error('Events data is empty');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_d_va_1',
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

    if (!eventsData.hasOwnProperty('AddedOwner')) {
      logger.error('Transaction not successful');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_d_va_2',
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
  async _markAuthorizedInDevicesTable() {
    const oThis = this;

    const paramsToUpdateDeviceStatus = {
      chainId: oThis.chainId,
      userId: oThis.userId,
      initialStatus: deviceConstants.authorizingStatus,
      finalStatus: deviceConstants.authorizedStatus,
      shardNumber: oThis.deviceShardNumber,
      walletAddress: oThis.deviceAddress
    };
    const UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus);

    return updateDeviceStatusObj.perform();
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyAuthorize,
  coreConstants.icNameSpace,
  'VerifyAuthorizeDeviceTransaction'
);
module.exports = VerifyAuthorize;
