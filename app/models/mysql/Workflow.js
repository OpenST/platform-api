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

  /**
   * Validates whether the kind and workflow exist in the workflow.
   *
   * @param {String} kind
   * @param {String} status
   *
   * @private
   */
  _validateKindAndStatus(kind, status) {
    if (!invertedKinds[kind]) {
      throw 'Invalid kind of workflow.';
    }

    if (!invertedStatuses[status]) {
      throw 'Invalid status of workflow.';
    }
  }

  /**
   * Inserts record
   *
   * @param {Object} params
   * @param {String} params.kind
   * @param {Number} params.clientId
   * @param {String} params.status
   * @param {String} params.requestParams
   * @param {String} params.debugParams
   *
   * @returns {Promise<*>}
   */
  async insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (!params.hasOwnProperty('kind') || !params.hasOwnProperty('status')) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {kind, status}';
    }

    oThis._validateKindAndStatus(params.kind, params.status);

    let kind = invertedKinds[params.kind],
      status = invertedStatuses[params.status],
      clientId = params.clientId ? params.clientId : null,
      requestParams = params.requestParams ? params.requestParams : null,
      debugParams = params.debugParams ? params.debugParams : null;

    return await oThis
      .insert({
        kind: kind,
        client_id: clientId,
        status: status,
        request_params: requestParams,
        debug_params: debugParams
      })
      .fire();
  }
}

module.exports = Workflow;
