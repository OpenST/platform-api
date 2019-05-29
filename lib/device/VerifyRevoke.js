/**
 * Module to verify if the revoke device transaction was done successfully.
 *
 * @module lib/device/VerifyRevoke
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/lib/device/UpdateStatus');
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');

/**
 * Class to verify if the revoke device transaction was done successfully.
 *
 * @class VerifyRevoke
 */
class VerifyRevoke {
  /**
   * Constructor to verify if the revoke device transaction was done successfully.
   *
   * @param {object} params
   * @param {string} params.userId
   * @param {string/number} params.chainId
   * @param {string/number} params.tokenId
   * @param {string} params.transactionHash
   * @param {number} params.deviceShardNumber
   * @param {string} params.deviceAddressToRemove
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
    oThis.deviceShardNumber = params.deviceShardNumber;
    oThis.deviceAddressToRemove = params.deviceAddressToRemove;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    await oThis._clearLinkedDeviceAddressCacheMap();

    const eventsData = await oThis._fetchContractEventsData();

    if (eventsData.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    const eventsCheckResponse = oThis._checkEventsData(eventsData.data);

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

    const paramsForGetTxEvent = {
      chainId: oThis.chainId,
      transactionHash: oThis.transactionHash,
      contractNames: ['GnosisSafe'],
      eventNamesMap: { RemovedOwner: 1 }
    };

    const GetTxEvent = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTxEvent'),
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
          internal_error_identifier: 'l_d_vr_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return eventsRsp;
  }

  /**
   * This function checks if 'RemovedOwner' event is present in events data passed.
   *
   * @param {object} eventsData
   *
   * @returns {Promise<any>|*|result}
   * @private
   */
  _checkEventsData(eventsData) {
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

    const paramsToUpdateDeviceStatus = {
      chainId: oThis.chainId,
      userId: oThis.userId,
      initialStatus: deviceConstants.revokingStatus,
      finalStatus: deviceConstants.revokedStatus,
      shardNumber: oThis.deviceShardNumber,
      walletAddress: oThis.deviceAddressToRemove
    };

    const UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus);

    return updateDeviceStatusObj.perform();
  }

  /**
   * Clear linked device address map cache.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearLinkedDeviceAddressCacheMap() {
    const oThis = this,
      PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId });

    await previousOwnersMapObj.clear();
  }
}

InstanceComposer.registerAsShadowableClass(VerifyRevoke, coreConstants.icNameSpace, 'VerifyRevokeDeviceTransaction');

module.exports = {};
