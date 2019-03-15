'use strict';
/**
 * This class file helps in submitting logout transaction
 *
 * @module lib/session/multiSigOperation/Logout
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  multiSigOperationBase = require(rootPrefix + '/lib/session/multisigOperation/Base');

class LogoutSessionTransaction extends multiSigOperationBase {
  constructor(params) {
    super(params);
  }

  /**
   * Get gas required to logout session.
   *
   * @returns {}
   *
   * @private
   */
  _getMultiSigOperationGas() {
    return contractConstants.logoutSessionGas;
  }
}

InstanceComposer.registerAsShadowableClass(
  LogoutSessionTransaction,
  coreConstants.icNameSpace,
  'LogoutSessionPerformTransaction'
);
