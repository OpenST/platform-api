'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  GetTxEvent = require(rootPrefix + '/lib/transactions/GetTxEvent'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
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

  async perform() {
    const oThis = this;

    await oThis.deleteSessionsEntry();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  async deleteSessionsEntry() {
    const oThis = this;

    logger.debug('*****Attempting to delete session entries');
    let deleteParams = [],
      SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel');

    deleteParams.push({
      userId: oThis.userId,
      address: oThis.sessionKey
    });

    new SessionModel({
      shardNumber: oThis.sessionShardNumber
    }).batchDeleteItem(deleteParams);
  }
}

InstanceComposer.registerAsShadowableClass(
  RollbackAuthorizeSession,
  coreConstants.icNameSpace,
  'RollbackAuthorizeSession'
);
module.exports = RollbackAuthorizeSession;
