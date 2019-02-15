'use strict';

/**
 *  Authorize device multi sig operation
 *
 * @module app/services/device/multisigOperation/AuthorizeDevice
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/app/services/device/multisigOperation/Base'),
  AuthorizeDeviceRouter = require(rootPrefix +
    '/executables/auxWorkflowRouter/multisigOperation/AuthorizeDeviceRouter'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/updateStatus');

class AuthorizeDevice extends Base {
  constructor(params) {
    super(params);
  }

  /**
   * perform operation
   *
   * @returns {Promise<any>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    await oThis._checkDeviceStatus();

    await oThis._updateDeviceStatus();

    await oThis._startWorkflow();

    let response = await oThis._prepareResponseEntity();

    return Promise.resolve(response);
  }

  /**
   * Check the status of device
   *
   * @returns {Promise<any>}
   * @private
   */
  async _checkDeviceStatus() {
    logger.debug('****Checking device status as registered');
    await super._checkDeviceStatus(deviceConstants.registeredStatus);

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * updates the status of device
   *
   * @returns {Promise<any>}
   * @private
   */
  async _updateDeviceStatus() {
    logger.debug('****Updating the device status as authorizing');
    await super._updateDeviceStatus(deviceConstants.authorisingStatus);

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Starts the workflow to submit authorize device transaction
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the authorize workflow ');
    let requestParams = {
        auxChainId: oThis._configStrategyObject.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        deviceAddress: oThis.deviceAddress,
        to: oThis.params.to,
        value: oThis.params.value,
        calldata: oThis.params.calldata,
        rawCalldata: oThis.params.raw_calldata,
        operation: oThis.params.operation,
        safeTxGas: oThis.params.safe_tx_gas,
        dataGas: oThis.params.data_gas,
        gasPrice: oThis.params.gas_price,
        gasToken: oThis.params.gas_token,
        refundReceiver: oThis.params.refund_receiver,
        signature: oThis.params.signature,
        signer: oThis.params.signer,
        chainEndpoint: oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite)
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
   * Prepares the response for Authorize Device service.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _prepareResponseEntity() {
    const oThis = this;

    logger.debug('****Preparing authorize device service response');
    let deviceDetailsAfterUpdateRsp = await super._fetchDeviceDetails(),
      response = {};

    response[resultType.device] = deviceDetailsAfterUpdateRsp.data;

    return Promise.resolve(responseHelper.successWithData(response));
  }
}

InstanceComposer.registerAsShadowableClass(AuthorizeDevice, coreConstants.icNameSpace, 'AuthorizeDevice');
