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
    '1': workflowConstants.stakeAndMintKind,
    '2': workflowConstants.tokenDeployKind,
    '3': workflowConstants.stateRootSyncKind
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
}

module.exports = Workflow;
