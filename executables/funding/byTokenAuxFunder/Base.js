'use strict';

/**
 * Cron to fund stPrime by tokenAuxFunder.
 *
 * @module executables/funding/byTokenAuxFunder/ByTokenAuxFunderBase
 *
 * This cron expects originChainId and auxChainIds as parameter in the params.
 */

const rootPrefix = '../../..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token');

class ByTokenAuxFunderBase extends CronBase {
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.canExit = true;
    oThis.tokenIds = [];
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
          internal_error_identifier: 'e_f_btaf_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { originChainId: oThis.originChainId }
        })
      );
    }

    if (!oThis.auxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_btaf_b_2',
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

    logger.step('Transferring StPrime to economy specific addresses.');
    let tokenIds = await oThis._getTokenIds();

    await oThis._startTransfer(tokenIds);

    logger.step('Cron completed.');
  }

  /**
   * Get tokenIds of current auxChain.
   *
   * @returns {Promise<Array>}
   * @private
   */
  async _getTokenIds() {
    const oThis = this;

    let clientIds = [],
      tokenIds = [];

    // Step 1: Fetch all clientIds associated to auxChainIds.
    let chainClientIds = await new ClientConfigGroup()
      .select('client_id')
      .where(['chain_id = (?)', oThis.auxChainId])
      .fire();

    logger.debug('On auxChainId', oThis.auxChainId, 'found chainClientIds', chainClientIds);

    for (let index = 0; index < chainClientIds.length; index++) {
      let clientId = chainClientIds[index].client_id;

      clientIds.push(clientId);
    }

    if (clientIds.length > 0) {
      // Step 2: Fetch all tokenIds associated to clientIds.
      let tokenRecords = await new TokenModel()
        .select('id')
        .where(['client_id IN (?)', clientIds])
        .where({ status: new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted] })
        .fire();

      for (let index = 0; index < tokenRecords.length; index++) {
        let tokenId = tokenRecords[index].id;

        tokenIds.push(tokenId);
      }

      logger.debug('On auxChainId', oThis.auxChainId, 'found tokenIds', tokenIds);
    }
    return tokenIds;
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

module.exports = ByTokenAuxFunderBase;
