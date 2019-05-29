/**
 * Module to submit logout session transaction.
 *
 * @module lib/session/multiSigOperation/Logout
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  MultiSigOperationBase = require(rootPrefix + '/lib/session/multisigOperation/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to submit logout session transaction.
 *
 * @class LogoutSessionTransaction
 */
class LogoutSessionTransaction extends MultiSigOperationBase {
  /**
   * Constructor to submit logout session transaction.
   *
   * @param {object} params
   *
   * @augments MultiSigOperationBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Get gas required to logout session.
   *
   * @returns number
   * @private
   */
  _getMultiSigOperationGas() {
    return contractConstants.logoutSessionGas;
  }

  /**
   * Get transaction kind.
   *
   * @return string
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
