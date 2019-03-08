'use strict';

/**
 * Cron to sync state root base
 *
 * @module executables/stateRootSync/Base
 *
 */

const rootPrefix = '../..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  StateRootSyncRouter = require(rootPrefix + '/lib/workflow/stateRootSync/Router'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic');

/**
 *
 * @class StateRootSyncBase
 */
class StateRootSyncBase extends CronBase {
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.canExit = true;

    oThis.highestFinalizedBlock = null;
  }

  /**
   * Validate and sanitize
   *
   * @return {Promise<>}
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.originChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_srs_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { originChainId: oThis.originChainId }
        })
      );
    }

    if (!oThis.auxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_srs_b_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId }
        })
      );
    }
  }

  /**
   * Start the cron.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    oThis.canExit = false;

    logger.step('Set source and destination chainIds');
    await oThis._setChainId();

    logger.step('Fetching highest finalized block');
    await oThis._getHighestFinalizedBlock();

    logger.step('Starting state root sync');
    await oThis._startStateRootSync();

    logger.step('Cron completed.');

    oThis.canExit = true;
  }

  /**
   * Set chain Ids.
   *
   * @private
   */
  _setChainId() {
    throw 'sub class to implement.';
  }

  /**
   * Get highest finalized block from blockScanner.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getHighestFinalizedBlock() {
    const oThis = this,
      blockScanner = await blockScannerProvider.getInstance([oThis.sourceChainId]),
      chainCronDataModel = blockScanner.model.ChainCronData,
      chainCronDataModelObj = new chainCronDataModel({}),
      chainCronDataResp = await chainCronDataModelObj.getCronData(oThis.sourceChainId);

    oThis.highestFinalizedBlock = chainCronDataResp[oThis.sourceChainId].lastFinalizedBlock;
  }

  /**
   * Start state root sync workflow.
   *
   * @private
   */
  async _startStateRootSync() {
    const oThis = this;

    let stateRootSyncParams = {
        stepKind: workflowStepConstants.commitStateRootInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstants.stateRootSync,
        requestParams: {
          auxChainId: oThis.auxChainId,
          sourceChainId: oThis.sourceChainId,
          destinationChainId: oThis.destinationChainId,
          blockNumber: oThis.highestFinalizedBlock
        }
      },
      stateRootRouterObj = new StateRootSyncRouter(stateRootSyncParams);

    let stateRootInitResponse = await stateRootRouterObj.perform();

    if (stateRootInitResponse.isSuccess()) {
      return true;
    }
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }
}

module.exports = StateRootSyncBase;
