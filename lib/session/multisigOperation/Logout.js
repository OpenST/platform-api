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
  multiSigOperationBase = require(rootPrefix + '/lib/session/multisigOperation/Base'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

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

  /**
   * Get transaction kind
   *
   * @return {string}
   * @private
   */
  _getMultiSigTransactionKind() {
    return pendingTransactionConstants.logoutSessionsKind;
  }
}

InstanceComposer.registerAsShadowableClass(
  LogoutSessionTransaction,
  coreConstants.icNameSpace,
  'LogoutSessionPerformTransaction'
);
