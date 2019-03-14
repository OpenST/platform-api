'use strict';
/**
 * This class file helps in submitting authorize transaction
 *
 * @module lib/multisigOperation/AuthorizeDeviceTransaction
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  multiSigOperationBase = require(rootPrefix + '/lib/session/multisigOperation/Base');

class AuthorizeSessionTransaction extends multiSigOperationBase {
  constructor(params) {
    super(params);
  }

  /**
   * Get gas required to revoke session.
   *
   * @returns {}
   *
   * @private
   */
  _getMultiSigOperationGas() {
    return contractConstants.authorizeSessionGas;
  }
}

InstanceComposer.registerAsShadowableClass(
  AuthorizeSessionTransaction,
  coreConstants.icNameSpace,
  'AuthorizeSessionPerformTransaction'
);
