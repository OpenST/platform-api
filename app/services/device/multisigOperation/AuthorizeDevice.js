'use strict';

/**
 *  Authorize device
 *
 * @module app/services/device/multisigOperation/AuthorizeDevice
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
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
    await super._fetchAndCheckDeviceStatus(deviceConstants.registeredStatus);

    return Promise.resolve(responseHelper.successWithData({}));
  }

  async _updateDeviceStatus() {
    await super._updateDeviceStatus(deviceConstants.authorisingStatus);

    return Promise.resolve(responseHelper.successWithData({}));
  }

  async _startWorkflow() {
    const oThis = this;

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
}

InstanceComposer.registerAsShadowableClass(AuthorizeDevice, coreConstants.icNameSpace, 'AuthorizeDevice');
