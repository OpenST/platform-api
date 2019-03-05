'use strict';
/**
 * Base class for Aux workflow router.
 *
 * @module lib/workflow/AuxRouterBase
 */
const rootPrefix = '../..',
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  WorkflowRouterBase = require(rootPrefix + '/lib/workflow/RouterBase');

/**
 * Class for Aux workflow router base.
 *
 * @class
 */
class AuxWorkflowRouterBase extends WorkflowRouterBase {
  /**
   * Constructor for Aux workflow router base.
   *
   * @param {Object} params
   * @param {Number} params.currentStepId  id of process parent
   * @param {Number} params.workflowId id of process parent
   * @param {String} params.stepKind Which step to execute in router
   * @param {String} params.topic
   * @param {String} params.workflowKind Kind of workflow
   * @param {String} params.taskStatus task is 'taskReadyToStart' or 'taskDone' or 'taskFailed' status.
   * @param {Object} params.taskResponseData when task is 'taskDone', send taskResponseData if required.
   * @param {Number} params.clientId
   * @param {Number} params.groupId
   * @param {Object} params.payload
   * @param {Object} params.requestParams
   * @param {Object} params.feResponseData
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Decide chainId based on step being.
   *
   * @private
   */
  _decideChainId() {
    const oThis = this;

    // For Aux workflow Router, chain Id would always be auxChainId
    oThis.chainId = oThis.requestParams.auxChainId;
    // We are assigning oThis.chainId to requestParams because requestParams should contain the chainId that the
    // current step needs to use. oThis.requestParams is being updated with the previous steps' chainId in two methods
    // above, namely: _validateAndSanitize and _clubRequestParamsFromDependencies.
    oThis.requestParams.chainId = oThis.chainId;
  }

  /**
   * Rabbitmq kind to which after receipt params to be published
   *
   * @private
   */
  get _rabbitmqKind() {
    return rabbitmqConstants.auxRabbitmqKind;
  }
}

module.exports = AuxWorkflowRouterBase;
