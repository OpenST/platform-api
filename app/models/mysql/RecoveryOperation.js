'use strict';
/**
 * Recovery Operation model
 *
 * @module /app/models/mysql/RecoveryOperation
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

// Declare variables.
const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  statuses = {
    '1': recoveryOperationConstants.inProgressStatus,
    '2': recoveryOperationConstants.waitingForAdminActionStatus,
    '3': recoveryOperationConstants.completedStatus,
    '4': recoveryOperationConstants.failedStatus
  },
  kinds = {
    '1': recoveryOperationConstants.initiateRecoveryByUserKind,
    '2': recoveryOperationConstants.abortRecoveryByUserKind,
    '3': recoveryOperationConstants.pinResetByUserKind,
    '4': recoveryOperationConstants.executeRecoveryByControllerKind,
    '5': recoveryOperationConstants.abortRecoveryByControllerKind
  },
  invertedStatuses = util.invert(statuses),
  invertedKinds = util.invert(kinds);

/**
 * Class for RecoveryOperation model.
 *
 * @class
 */
class RecoveryOperation extends ModelBase {
  /**
   * Constructor for RecoveryOperation model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'recovery_operations';
  }

  get statuses() {
    return statuses;
  }

  get kinds() {
    return kinds;
  }

  get invertedStatuses() {
    return invertedStatuses;
  }

  get invertedKinds() {
    return invertedKinds;
  }

  /**
   * Get by Token Uer
   *
   * @param token_id
   * @param userId
   * @returns {*|void}
   */
  getPendingOperationsOfTokenUser(token_id, userId) {
    const oThis = this,
      pendingStatuses = [
        oThis.invertedStatuses[recoveryOperationConstants.inProgressStatus],
        oThis.invertedStatuses[recoveryOperationConstants.waitingForAdminActionStatus]
      ];

    return oThis
      .select('*')
      .where(['token_id=? AND user_id=? AND status IN (?)', token_id, userId, pendingStatuses])
      .fire();
  }
}

module.exports = RecoveryOperation;
