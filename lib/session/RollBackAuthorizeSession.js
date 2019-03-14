'use strict';
/**
 * This class file rollbacks all the changes done before performing authorize device transaction.
 *
 * @module lib/session/RollBackAuthorizeSession
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

require(rootPrefix + '/app/models/ddb/sharded/Session');

class RollbackAuthorizeSession {
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

    await oThis._deleteSessionsEntry();

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
  async _deleteSessionsEntry() {
    const oThis = this;

    logger.debug('*****Attempting to delete session entries');
    let deleteParams = [],
      SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel');

    deleteParams.push({
      userId: oThis.userId,
      address: oThis.sessionKey
    });

    let deleteResponse = await new SessionModel({
      shardNumber: oThis.sessionShardNumber
    }).batchDeleteItem(deleteParams);

    if (deleteResponse.isFailure()) {
      logger.error('Error in deleting sessions entry.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_rbas_1',
          api_error_identifier: 'error_in_deleting_session',
          debug_options: {
            deleteResponse: deleteResponse
          }
        })
      );
    }

    // Delete session cache
    SessionModel.afterUpdate(oThis.ic(), { userId: oThis.userId, address: oThis.sessionKey });

    return deleteResponse;
  }
}

InstanceComposer.registerAsShadowableClass(
  RollbackAuthorizeSession,
  coreConstants.icNameSpace,
  'RollbackAuthorizeSession'
);
module.exports = RollbackAuthorizeSession;
