/**
 * Module to authorize device multi sig operation.
 *
 * @module app/services/device/multisigOperation/AuthorizeDevice
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  Base = require(rootPrefix + '/app/services/device/multisigOperation/Base'),
  AuthorizeDeviceRouter = require(rootPrefix + '/lib/workflow/authorizeDevice/Router'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/UpdateStatus');

/**
 * Class to authorize device multi sig operation.
 *
 * @class AuthorizeDevice
 */
class AuthorizeDevice extends Base {
  /**
   * Constructor to authorize device multi sig operation.
   *
   * @param {object} params
   * @param {object} params.raw_calldata
   * @param {string} params.raw_calldata.method: possible value addOwnerWithThreshold
   * @param {array} params.raw_calldata.parameters:
   * @param {string} params.raw_calldata.parameters[0]: new device address
   * @param {string/number} params.raw_calldata.parameters[1]: requirement/threshold
   *
   * @augments Base
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.rawCalldata = params.raw_calldata;

    oThis.deviceAddress = null;
  }

  /**
   * Sanitize service specific params.
   *
   * @sets oThis.deviceAddress
   *
   * @returns {Promise<Promise<never>|undefined>}
   * @private
   */
  async _sanitizeSpecificParams() {
    const oThis = this;

    oThis.rawCalldata = await basicHelper.sanitizeRawCallData(oThis.rawCalldata);

    if (!CommonValidators.validateRawCallData(oThis.rawCalldata)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_ad_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata'],
          debug_options: {}
        })
      );
    }

    const rawCallDataMethod = oThis.rawCalldata.method;
    if (rawCallDataMethod !== 'addOwnerWithThreshold') {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_ad_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_method'],
          debug_options: {}
        })
      );
    }

    const rawCallDataParameters = oThis.rawCalldata.parameters;
    if (!(rawCallDataParameters instanceof Array) || !CommonValidators.validateEthAddress(rawCallDataParameters[0])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_ad_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_address'],
          debug_options: {}
        })
      );
    }

    if (Number(rawCallDataParameters[1]) !== 1) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_ad_4',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_threshold'],
          debug_options: {}
        })
      );
    }

    oThis.deviceAddress = basicHelper.sanitizeAddress(rawCallDataParameters[0]);
  }

  /**
   * Performs specific pre checks.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performSpecificPreChecks() {
    const oThis = this;

    const deviceDetailsRsp = await oThis._fetchDeviceDetails([oThis.deviceAddress, oThis.signer]);

    const deviceAddressDetails = deviceDetailsRsp.data[oThis.deviceAddress],
      signerAddressDetails = deviceDetailsRsp.data[oThis.signer];

    if (
      basicHelper.isEmptyObject(signerAddressDetails) ||
      signerAddressDetails.status !== deviceConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_ad_5',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_signer'],
          debug_options: {}
        })
      );
    }

    if (
      basicHelper.isEmptyObject(deviceAddressDetails) ||
      deviceAddressDetails.status !== deviceConstants.registeredStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_ad_6',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_device_address'],
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * Perform operation.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    const updateResponse = await oThis._updateDeviceStatus(
      oThis.deviceAddress,
      deviceConstants.registeredStatus,
      deviceConstants.authorizingStatus
    );

    await oThis._startWorkflow();

    return oThis._prepareResponseEntity(updateResponse);
  }

  /**
   * Starts the workflow to submit authorize device transaction.
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the authorize workflow ');

    const requestParams = {
        auxChainId: oThis._configStrategyObject.auxChainId,
        tokenId: oThis.tokenId,
        clientId: oThis.clientId,
        userId: oThis.userId,
        deviceAddress: oThis.deviceAddress,
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
        multisigAddress: oThis.multisigAddress,
        deviceNonce: oThis.nonce
      },
      authorizeDeviceInitParams = {
        stepKind: workflowStepConstants.authorizeDeviceInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.authorizeDevice,
        requestParams: requestParams
      };

    const authorizeDeviceObj = new AuthorizeDeviceRouter(authorizeDeviceInitParams);

    return authorizeDeviceObj.perform();
  }

  /**
   * Prepares the response for authorize device service.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _prepareResponseEntity(updateResponseData) {
    logger.debug('****Preparing authorize device service response');

    const responseHash = updateResponseData.data;

    responseHash.linkedAddress = null;

    return responseHelper.successWithData({
      [resultType.device]: responseHash
    });
  }
}

InstanceComposer.registerAsShadowableClass(AuthorizeDevice, coreConstants.icNameSpace, 'AuthorizeDevice');
