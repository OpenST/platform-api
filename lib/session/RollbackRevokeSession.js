'use strict';
/**
 * This class file rollbacks all the changes done before performing revoke session transaction.
 *
 * @module lib/session/RollbackRevokeSession
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

require(rootPrefix + '/app/models/ddb/sharded/Session');

class RollbackRevokeSession {
  constructor(params) {
    const oThis = this;
    oThis.sessionKey = params.sessionKey;
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;
    oThis.userId = params.userId;
    oThis.sessionShardNumber = params.sessionShardNumber;
  }

  /**
   * perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    await oThis._updateSessionsEntry();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  /**
   * Deletes the session entry from db.
   *
   * @returns {Promise<result>}
   * @private
   */
  async _updateSessionsEntry() {
    const oThis = this;

    logger.debug('*****Attempting to update session entry');

    let SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionModelObj = new SessionModel({ shardNumber: oThis.sessionShardNumber }),
      updateRsp = await sessionModelObj.updateStatusFromInitialToFinal(
        oThis.userId,
        oThis.sessionKey,
        sessionConstants.revokingStatus,
        sessionConstants.authorizedStatus
      );

    return updateRsp;
  }
}

InstanceComposer.registerAsShadowableClass(RollbackRevokeSession, coreConstants.icNameSpace, 'RollbackRevokeSession');
module.exports = RollbackRevokeSession;
