'use strict';
/**
 * Recovery Operation model
 *
 * @module /app/models/mysql/RecoveryOperation
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

// Declare variables.
const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

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

  /**
   * Get by Token Uer
   *
   * @param {String/Number} tokenId
   * @param {String/Number} userId
   *
   * @returns {*|void}
   */
  getPendingOperationsOfTokenUser(tokenId, userId) {
    const oThis = this,
      pendingStatuses = [
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus],
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.waitingForAdminActionStatus]
      ];

    return oThis
      .select('*')
      .where(['token_id=? AND user_id=? AND status IN (?)', tokenId, userId, pendingStatuses])
      .fire();
  }
}

module.exports = RecoveryOperation;
