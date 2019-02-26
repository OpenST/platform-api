'use strict';
/**
 * Model to get workflow details.
 *
 * @module /app/models/mysql/Workflow
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  statuses = {
    '1': workflowConstants.inProgressStatus,
    '2': workflowConstants.completedStatus,
    '3': workflowConstants.failedStatus,
    '4': workflowConstants.completelyFailedStatus
  },
  kinds = {
    '1': workflowConstants.tokenDeployKind,
    '2': workflowConstants.stateRootSyncKind,
    '3': workflowConstants.stPrimeStakeAndMintKind,
    '4': workflowConstants.btStakeAndMintKind,
    '5': workflowConstants.grantEthOstKind,
    '6': workflowConstants.setupUserKind,
    '7': workflowConstants.testKind,
    '8': workflowConstants.authorizeDeviceKind,
    '9': workflowConstants.authorizeSessionKind,
    '10': workflowConstants.revokeDeviceKind,
    '11': workflowConstants.revokeSessionKind,
    '12': workflowConstants.initiateRecoveryKind,
    '13': workflowConstants.abortRecoveryByOwnerKind,
    '14': workflowConstants.resetRecoveryOwnerKind,
    '15': workflowConstants.executeRecoveryKind,
    '16': workflowConstants.abortRecoveryByRecoveryControllerKind
  },
  invertedStatuses = util.invert(statuses),
  invertedKinds = util.invert(kinds);

/**
 * Class for workflow model.
 *
 * @class
 */
class Workflow extends ModelBase {
  /**
   * Constructor for workflow model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'workflows';
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
   * This function will add response data in workflow
   *
   * @param {Number/String} id
   * @param {Object} responseData
   *
   * @returns Promise<>
   */
  async updateResponseData(id, responseData) {
    const oThis = this;

    let rec = await oThis
      .select('*')
      .where({ id: id })
      .fire();

    let respData = Object.assign(responseData, JSON.parse(rec[0].response_data)),
      updateData = { response_data: JSON.stringify(respData) };

    return oThis
      .update(updateData)
      .where({ id: id })
      .fire();
  }
}

module.exports = Workflow;
