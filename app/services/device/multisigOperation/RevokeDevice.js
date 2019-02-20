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
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/app/services/device/multisigOperation/Base'),
  RevokeDeviceRouter = require(rootPrefix + '/executables/auxWorkflowRouter/multisigOperation/RevokeDeviceRouter'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/UpdateStatus');

class RevokeDevice extends Base {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.previousDeviceAddress = params.raw_calldata['parameters'][0];
    oThis.deviceAddressToRemove = params.raw_calldata['parameters'][1];
  }

  /**
   * perform operation
   *
   * @returns {Promise<any>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    oThis._sanitizeSpecificParams();

    logger.debug('****Updating the device status as revoking only if it was authorized');
    let updateResponse = await oThis._updateDeviceStatus(
      oThis.deviceAddressToRemove,
      deviceConstants.authorisedStatus,
      deviceConstants.revokingStatus
    );

    await oThis._startWorkflow();

    return oThis._prepareResponseEntity(updateResponse);
  }

  _sanitizeSpecificParams() {
    const oThis = this;
    oThis.previousDeviceAddress = basicHelper.sanitizeAddress(oThis.previousDeviceAddress);
    oThis.deviceAddressToRemove = basicHelper.sanitizeAddress(oThis.deviceAddressToRemove);
  }

  /**
   * Starts the workflow to submit revoke device transaction
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the revoke workflow ');
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
        signature: oThis.signature,
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
    let responseHash = updateResponseData.data,
      linkedAddress = oThis._fetchLinkedDeviceAddress(oThis.deviceAddressToRemove);

    responseHash['linkedAddress'] = linkedAddress;

    return responseHelper.successWithData({
      [resultType.device]: responseHash
    });
  }
}

InstanceComposer.registerAsShadowableClass(RevokeDevice, coreConstants.icNameSpace, 'RevokeDevice');
