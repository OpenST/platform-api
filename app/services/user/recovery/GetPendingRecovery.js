'use strict';
/**
 * This service fetches recovery request of user which is waiting for admin action.
 *
 * @module app/services/user/recovery/GetPendingRecovery
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  RecoveryOperationModelKlass = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  WorkflowCacheKlass = require(rootPrefix + '/lib/cacheManagement/kitSaas/Workflow'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common');

require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class GetPendingRecovery extends ServiceBase {
  /**
   * @constructor
   *
   * @param {Object} params
   * @param {Number} params.client_id - client Id
   * @param {Number} [params.token_id] - token Id
   * @param {Number} [params.user_id] - user Id
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.userId = params.user_id;

    oThis.userData = null;
    oThis.pendingRecoveryParams = null;
    oThis.deviceDetails = [];
  }

  /**
   * perform - Perform Get user lists
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    await oThis._getUserDetailsFromCache();

    await oThis._fetchPendingRecoveryOperation();

    return oThis._formatApiResponse();
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _getUserDetailsFromCache() {
    const oThis = this;

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    let tokenUserDetailsCache = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCache.fetch();

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('Could not fetched token user details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_gpr_1',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    const details = tokenUserDetailsCacheRsp.data[oThis.userId];

    if (!CommonValidators.validateObject(details)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_gpr_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    if (details.status != tokenUserConstants.activatedStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_gpr_3',
          api_error_identifier: 'user_not_activated',
          debug_options: {}
        })
      );
    }

    oThis.userData = details;
  }

  /**
   * Fetch Pending recovery operation of user.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchPendingRecoveryOperation() {
    const oThis = this;

    let recoveryOperations = await new RecoveryOperationModelKlass().getPendingOperationsOfTokenUser(
      oThis.tokenId,
      oThis.userId
    );

    // There are pending recovery operations of user, so check for devices involved
    if (recoveryOperations.length > 0) {
      for (let index in recoveryOperations) {
        const operation = recoveryOperations[index];
        if (
          operation.workflow_id &&
          operation.kind ==
            recoveryOperationConstants.invertedKinds[recoveryOperationConstants.initiateRecoveryByUserKind]
        ) {
          const workflowDetails = await new WorkflowCacheKlass({ workflowId: operation.workflow_id }).fetch();
          if (workflowDetails.data) {
            const workflow = workflowDetails.data[operation.workflow_id];

            oThis.pendingRecoveryParams = JSON.parse(workflow.requestParams);
            break;
          }
        }
      }
    }
  }

  /**
   * Fetch devices from cache.
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchDevices() {
    const oThis = this;

    const DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        walletAddresses: [oThis.pendingRecoveryParams.oldDeviceAddress, oThis.pendingRecoveryParams.newDeviceAddress],
        shardNumber: oThis.userData.deviceShardNumber
      }),
      response = await deviceDetailCache.fetch();

    return response;
  }

  /**
   * Get user device extended details
   *
   * @returns {Promise<*|result>}
   */
  async _fetchDevicesExtendedDetails() {
    const oThis = this;

    let response = await oThis._fetchDevices(),
      walletAddresses = [oThis.pendingRecoveryParams.oldDeviceAddress, oThis.pendingRecoveryParams.newDeviceAddress],
      devices = response.data,
      linkedAddressesMap = await oThis._fetchLinkedDeviceAddressMap();

    for (let index in walletAddresses) {
      let deviceAddr = walletAddresses[index],
        device = devices[deviceAddr];

      if (!CommonValidators.validateObject(device)) {
        continue;
      }
      device.linkedAddress = linkedAddressesMap[device.walletAddress];
      oThis.deviceDetails.push(device);
    }
  }

  /**
   * fetch linked device addresses for specified user id
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchLinkedDeviceAddressMap() {
    const oThis = this;

    const PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.fetch();

    if (previousOwnersMapRsp.isFailure()) {
      logger.error('Error in fetching linked addresses');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_d_g_b_2',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data;
  }

  /**
   * Format API
   *
   * @returns {Promise<*>}
   * @private
   */
  async _formatApiResponse() {
    const oThis = this;

    if (!oThis.pendingRecoveryParams) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_gpr_4',
          api_error_identifier: 'initiate_recovery_request_not_present',
          debug_options: {}
        })
      );
    }

    await oThis._fetchDevicesExtendedDetails();

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.devices]: oThis.deviceDetails
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(GetPendingRecovery, coreConstants.icNameSpace, 'GetPendingRecovery');

module.exports = {};
