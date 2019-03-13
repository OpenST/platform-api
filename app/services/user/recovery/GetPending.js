'use strict';
/**
 * This service fetches recovery request of user which is waiting for admin action.
 *
 * @module app/services/user/recovery/GetPending
 */

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  WorkflowCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Workflow'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/UserPendingRecoveryOperations');

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

    await oThis._validateTokenStatus();

    await oThis._getUserDetailsFromCache();

    await oThis._fetchPendingRecoveryOperation();

    await oThis._fetchDevicesExtendedDetails();

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

    const userData = tokenUserDetailsCacheRsp.data[oThis.userId];

    // error out if user data not fetched.
    if (!CommonValidators.validateObject(userData)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_gpr_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    // check if user is activated, otherwise error out.
    if (userData.status !== tokenUserConstants.activatedStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_gpr_3',
          api_error_identifier: 'user_not_activated',
          debug_options: {}
        })
      );
    }

    oThis.userData = userData;
  }

  /**
   * Fetch Pending recovery operation of user.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchPendingRecoveryOperation() {
    const oThis = this;

    let UserRecoveryOpsCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserPendingRecoveryOperations'),
      recoveryOperationsResp = await new UserRecoveryOpsCache({ tokenId: oThis.tokenId, userId: oThis.userId }).fetch(),
      recoveryOperations = recoveryOperationsResp.data.recoveryOperations || [];

    // There are pending recovery operations of user, so check for devices involved
    for (let index = 0; index < recoveryOperations.length; index++) {
      const operation = recoveryOperations[index];

      // There can be only one recovery operation with status initiateRecoveryByUserKind. Fetch it.
      if (
        operation.workflow_id &&
        operation.kind ==
          recoveryOperationConstants.invertedKinds[recoveryOperationConstants.initiateRecoveryByUserKind]
      ) {
        const workflowDetailsFetchResponse = await new WorkflowCache({ workflowId: operation.workflow_id }).fetch();
        if (workflowDetailsFetchResponse.data) {
          const workflow = workflowDetailsFetchResponse.data[operation.workflow_id];

          oThis.pendingRecoveryParams = JSON.parse(workflow.requestParams);
          break;
        }
      }
    }

    if (!oThis.pendingRecoveryParams) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_gpr_4',
          api_error_identifier: 'initiate_recovery_request_not_present',
          debug_options: {}
        })
      );
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
      });

    return deviceDetailCache.fetch();
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
  _formatApiResponse() {
    const oThis = this;

    return responseHelper.successWithData({
      [resultType.devices]: oThis.deviceDetails
    });
  }
}

InstanceComposer.registerAsShadowableClass(GetPendingRecovery, coreConstants.icNameSpace, 'GetPendingRecovery');

module.exports = {};
