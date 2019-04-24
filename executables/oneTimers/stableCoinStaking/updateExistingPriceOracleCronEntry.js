/**
 * Module to update existing price oracle cron entry.
 *
 * @module executables/oneTimers/stableCoinStaking/updateExistingPriceOracleCronEntry
 */

const rootPrefix = '../../..',
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class to update existing price oracle cron entry.
 *
 * @class UpdateExistingPriceOracleCronEntry
 */
class UpdateExistingPriceOracleCronEntry {
  /**
   * Constructor to update existing price oracle cron entry.
   *
   * @param {string/number} auxChainId
   *
   * @constructor
   */
  constructor(auxChainId) {
    const oThis = this;

    oThis.auxChainId = auxChainId;

    oThis.tableIdToAuxChainIdMap = {};
    oThis.tableIds = [];
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(`${__filename}::perform`);

      return responseHelper.error({
        internal_error_identifier: 'e_ot_scs_upoce_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<result>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._fetchExistingCronEntries();

    return oThis._updateCronParams();
  }

  /**
   * Fetch existing cron entry.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchExistingCronEntries() {
    const oThis = this;

    const existingCronEntries = await new CronProcessModel()
      .select('*')
      .where({
        kind_name: cronProcessesConstants.updatePriceOraclePricePoints
      })
      .fire();

    for (let index = 0; index < existingCronEntries.length; index++) {
      const cronEntity = existingCronEntries[index];

      const cronParams = JSON.parse(cronEntity.params);

      oThis.tableIdToAuxChainIdMap[cronEntity.id] = cronParams.auxChainId;
      oThis.tableIds.push(cronEntity.id);
    }
  }

  /**
   * Update cron params to add baseCurrency as parameter.
   *
   * @return {Promise<result>}
   * @private
   */
  async _updateCronParams() {
    const oThis = this;

    if (oThis.tableIds.length === 0) {
      logger.error('Could not find any price oracle cron entry in the environment. Exiting.');

      return Promise.reject(new Error('Could not find any price oracle cron entry in the environment. Exiting.'));
    }

    const promises = [];

    for (let index = 0; index < oThis.tableIds.length; index++) {
      const tableId = oThis.tableIds[index];
      const cronParams = JSON.stringify({
        auxChainId: oThis.tableIdToAuxChainIdMap[tableId],
        baseCurrency: 'OST'
      });
      promises.push(
        new CronProcessModel()
          .update({ params: cronParams })
          .where({
            id: tableId
          })
          .fire()
      );
    }

    await Promise.all(promises);

    return responseHelper.successWithData({ tableIdToAuxChainIdMap: oThis.tableIdToAuxChainIdMap });
  }
}

new UpdateExistingPriceOracleCronEntry().perform().then((response) => {
  if (response.isFailure()) {
    logger.error(`One-timer failed. Response: ${JSON.stringify(response)}`);
    process.exit(1);
  }
  logger.win(`One-timer finished. Response: ${JSON.stringify(response)}`);
  process.exit(0);
});
