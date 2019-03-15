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

  /**
   * Insert recovery operation row in DB
   *
   * @param insertParams
   * @returns {Promise<any>}
   */
  async insertOperation(insertParams) {
    const oThis = this;

    let insertRsp = await oThis.insert(insertParams).fire();

    await RecoveryOperation.flushCache(insertParams.token_id, insertParams.user_id);

    return insertRsp;
  }

  /**
   * Update recovery operation
   *
   * @param id
   * @param updateParams
   * @returns {Promise<any>}
   */
  async updateRecoveryOperation(id, updateParams) {
    const oThis = this;

    let updateResp = await oThis
      .update(updateParams)
      .where({ id: id })
      .fire();

    await RecoveryOperation.flushCache(updateParams.token_id, updateParams.user_id);

    return updateResp;
  }

  /**
   * Flush cache
   *
   * @param tokenId
   * @param userId
   */
  static flushCache(tokenId, userId) {
    const PendingRecoveryCache = require(rootPrefix + '/lib/cacheManagement/shared/UserPendingRecoveryOperations');

    new PendingRecoveryCache({
      tokenId: tokenId,
      userId: userId
    }).clear();
  }
}

module.exports = RecoveryOperation;
