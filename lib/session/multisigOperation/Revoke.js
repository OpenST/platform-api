'use strict';
/**
 * This class file helps in submitting revoke transaction
 *
 * @module lib/session/multiSigOperation/Revoke
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  multiSigOperationBase = require(rootPrefix + '/lib/session/multisigOperation/Base');

class RevokeSessionTransaction extends multiSigOperationBase {
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
    return contractConstants.revokeSessionGas;
  }
}

InstanceComposer.registerAsShadowableClass(
  RevokeSessionTransaction,
  coreConstants.icNameSpace,
  'RevokeSessionPerformTransaction'
);
