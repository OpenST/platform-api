/**
 * Module for workflow details model.
 *
 * @module /app/models/mysql/Workflow
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  util = require(rootPrefix + '/lib/util'),
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
    '5': workflowConstants.grantEthStakeCurrencyKind,
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
    '16': workflowConstants.abortRecoveryByRecoveryControllerKind,
    '17': workflowConstants.logoutSessionsKind,
    '18': workflowConstants.stPrimeRedeemAndUnstakeKind,
    '19': workflowConstants.btRedeemAndUnstakeKind,
    '20': workflowConstants.updatePricePointKind
  },
  invertedStatuses = util.invert(statuses),
  invertedKinds = util.invert(kinds);

/**
 * Class for workflow details model.
 *
 * @class Workflow
 */
class Workflow extends ModelBase {
  /**
   * Constructor for workflow details model.
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
   * This function will add response data in workflow.
   *
   * @param {number/string} id
   * @param {object} responseData
   *
   * @returns Promise<>
   */
  async updateResponseData(id, responseData) {
    const oThis = this;

    const rec = await oThis
      .select('*')
      .where({ id: id })
      .fire();

    const respData = Object.assign(responseData, JSON.parse(rec[0].response_data)),
      updateData = { response_data: JSON.stringify(respData) };

    return oThis
      .update(updateData)
      .where({ id: id })
      .fire();
  }

  /**
   * Flush cache.
   *
   * @param {object} params
   *
   * @returns {Promise<*>}
   */
  static async flushCache(params) {
    const WorkflowCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Workflow');

    await new WorkflowCache({
      workflowId: params.workflowId
    }).clear();

    const WorkflowByClientCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/WorkflowByClient');
    await new WorkflowByClientCache({
      clientId: params.clientId
    }).clear();
  }
}

module.exports = Workflow;
