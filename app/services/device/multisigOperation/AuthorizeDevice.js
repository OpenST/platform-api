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
require(rootPrefix + '/lib/device/UpdateStatus');

class AuthorizeDevice extends Base {
  /**
   * @constructor
   *
   * @param params
   */
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

    logger.debug('****Checking device status as registered');
    await oThis._checkDeviceStatus(deviceConstants.registeredStatus);

    logger.debug('****Updating the device status as authorizing');
    await oThis._updateDeviceStatus(deviceConstants.authorisingStatus);

    await oThis._startWorkflow();

    return oThis._prepareResponseEntity();
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
        chainEndpoint: oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite),
        devicesShardNumber: oThis.devicesShardNumber
      },
      authorizeDeviceInitParams = {
        stepKind: workflowStepConstants.authorizeDeviceInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.authorizeDevice,
        requestParams: requestParams
      };

    let authorizeDeviceObj = new AuthorizeDeviceRouter(authorizeDeviceInitParams);

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
    let deviceDetailsAfterUpdateRsp = await super._fetchDeviceDetails();

    return responseHelper.successWithData({
      [resultType.device]: deviceDetailsAfterUpdateRsp.data
    });
  }
}

InstanceComposer.registerAsShadowableClass(AuthorizeDevice, coreConstants.icNameSpace, 'AuthorizeDevice');