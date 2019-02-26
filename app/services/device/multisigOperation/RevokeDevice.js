'use strict';

/**
 *  Revoke device multi sig operation
 *
 * @module app/services/device/multisigOperation/RevokeDevice
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/app/services/device/multisigOperation/Base'),
  RevokeDeviceRouter = require(rootPrefix + '/lib/workflow/revokeDevice/Router'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/UpdateStatus');

/**
 * Class to revoke device multi sig operation
 *
 * @class RevokeDevice
 */
class RevokeDevice extends Base {
  /**
   *
   * @param {Object} params
   * @param {Object} params.raw_calldata -
   * @param {String} params.raw_calldata.method - possible value removeOwner
   * @param {Array} params.raw_calldata.parameters -
   * @param {String} params.raw_calldata.parameters[0] - previous device address (linked address)
   * @param {String} params.raw_calldata.parameters[1] - old device address
   * @param {String/Number} params.raw_calldata.parameters[2] - requirement/threshold
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.rawCalldata = params.raw_calldata;

    oThis.previousDeviceAddress = null;
    oThis.deviceAddressToRemove = null;
  }

  /**
   * Sanitize action specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _sanitizeSpecificParams() {
    const oThis = this;

    oThis.rawCalldata = await basicHelper.sanitizeRawCallData(oThis.rawCalldata);

    let rawCallDataMethod = oThis.rawCalldata.method;
    if (rawCallDataMethod != 'removeOwner') {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_method'],
          debug_options: {}
        })
      );
    }

    let rawCallDataParameters = oThis.rawCalldata.parameters;
    if (
      !(rawCallDataParameters instanceof Array) ||
      !CommonValidators.validateEthAddress(rawCallDataParameters[0]) ||
      !CommonValidators.validateEthAddress(rawCallDataParameters[1])
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_address'],
          debug_options: {}
        })
      );
    }

    if (Number(rawCallDataParameters[2]) !== 1) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_threshold'],
          debug_options: {}
        })
      );
    }
    oThis.previousDeviceAddress = basicHelper.sanitizeAddress(rawCallDataParameters[0]);
    oThis.deviceAddressToRemove = basicHelper.sanitizeAddress(rawCallDataParameters[1]);
  }

  /**
   * Performs action specific pre checks
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performSpecificPreChecks() {
    const oThis = this;

    let deviceDetailsRsp = await oThis._fetchDeviceDetails([oThis.deviceAddressToRemove, oThis.signer]);

    let deviceAddressDetails = deviceDetailsRsp.data[oThis.deviceAddressToRemove],
      signerAddressDetails = deviceDetailsRsp.data[oThis.signer];

    if (
      basicHelper.isEmptyObject(signerAddressDetails) ||
      signerAddressDetails.status !== deviceConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_4',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_signer'],
          debug_options: {}
        })
      );
    }

    if (
      basicHelper.isEmptyObject(deviceAddressDetails) ||
      deviceAddressDetails.status !== deviceConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_5',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_device_address'],
          debug_options: {}
        })
      );
    }

    let previousDeviceAddress = await oThis._fetchLinkedDeviceAddress();

    if (previousDeviceAddress !== oThis.previousDeviceAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_6',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_device_address'],
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * Fetch linked address of given device address
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchLinkedDeviceAddress() {
    const oThis = this;

    let PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.fetch();

    if (previousOwnersMapRsp.isFailure()) {
      logger.error('Error in fetching linked addresses');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_mo_rd_7',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data[oThis.deviceAddressToRemove];
  }

  /**
   * perform operation
   *
   * @returns {Promise<any>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    let updateResponse = await oThis._updateDeviceStatus(
      oThis.deviceAddressToRemove,
      deviceConstants.authorizedStatus,
      deviceConstants.revokingStatus
    );

    await oThis._startWorkflow();

    return oThis._prepareResponseEntity(updateResponse);
  }

  /**
   * Starts the workflow to submit revoke device transaction
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the revoke workflow');

    let requestParams = {
        auxChainId: oThis._configStrategyObject.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        deviceAddressToRemove: oThis.deviceAddressToRemove,
        to: oThis.to,
        value: oThis.value,
        calldata: oThis.calldata,
        rawCalldata: oThis.rawCalldata,
        operation: oThis.operation,
        safeTxGas: oThis.safeTxGas,
        dataGas: oThis.dataGas,
        gasPrice: oThis.gasPrice,
        gasToken: oThis.gasToken,
        refundReceiver: oThis.refundReceiver,
        signatures: oThis.signatures,
        signer: oThis.signer,
        chainEndpoint: oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite),
        deviceShardNumber: oThis.deviceShardNumber,
        multisigAddress: oThis.multisigAddress
      },
      revokeDeviceInitParams = {
        stepKind: workflowStepConstants.revokeDeviceInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.revokeDevice,
        requestParams: requestParams
      };

    let revokeDeviceObj = new RevokeDeviceRouter(revokeDeviceInitParams);

    return revokeDeviceObj.perform();
  }

  /**
   * Prepares the response for Device multisig operation service.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _prepareResponseEntity(updateResponseData) {
    const oThis = this;

    logger.debug('****Preparing revoke device service response');

    let responseHash = updateResponseData.data;

    responseHash.linkedAddress = oThis.previousDeviceAddress;

    return responseHelper.successWithData({
      [resultType.device]: responseHash
    });
  }
}

InstanceComposer.registerAsShadowableClass(RevokeDevice, coreConstants.icNameSpace, 'RevokeDevice');
