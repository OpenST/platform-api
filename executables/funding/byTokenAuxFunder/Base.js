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
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup');

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
          internal_error_identifier: 'e_f_bco_spe_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { originChainId: oThis.originChainId }
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

    logger.step('Fetching all chainIds.');
    await oThis._fetchChainIds();

    logger.step('Transferring StPrime to auxChainId addresses.');
    await oThis._transferStPrimeToAll();

    logger.step('Cron completed.');
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

  /**
   * Fetch all chainIds.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchChainIds() {
    const oThis = this;

    if (!oThis.auxChainIds || oThis.auxChainIds.length === 0) {
      oThis.chainIds = await chainConfigProvider.allChainIds();
      oThis.auxChainIds = oThis.chainIds.filter((chainId) => chainId !== oThis.originChainId);
    }
  }

  /**
   * Transfer StPrime on all auxChainIds.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _transferStPrimeToAll() {
    const oThis = this;

    // Loop over all auxChainIds.
    for (let index = 0; index < oThis.auxChainIds.length; index++) {
      let tokenIds = await oThis._getTokenIds(oThis.auxChainIds[index]);
      await oThis._startTransfer(tokenIds, oThis.auxChainIds[index]);
    }
  }

  /**
   * Get tokenIds of current auxChain.
   *
   * @param auxChainId
   * @returns {Promise<Array>}
   * @private
   */
  async _getTokenIds(auxChainId) {
    const oThis = this;

    let clientIds = [],
      tokenIds = [];

    // Step 1: Fetch all clientIds associated to auxChainIds.
    let chainClientIds = await new ClientConfigGroup()
      .select('client_id')
      .where(['chain_id = (?)', auxChainId])
      .fire();
    logger.debug('chainClientIds', chainClientIds);

    for (let index = 0; index < chainClientIds.length; index++) {
      let clientId = chainClientIds[index].client_id;

      clientIds.push(clientId);
    }

    // Step 2: Fetch all tokenIds associated to clientIds.
    let clientTokenIds = await new TokenModel()
      .select('id')
      .where(['client_id IN (?)', clientIds])
      .fire();

    for (let index = 0; index < clientTokenIds.length; index++) {
      let tokenId = clientTokenIds[index].id;

      tokenIds.push(tokenId);
    }
    return tokenIds;
  }
}

module.exports = ByTokenAuxFunderBase;
