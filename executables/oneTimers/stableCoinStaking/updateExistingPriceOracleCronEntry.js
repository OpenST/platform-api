/**
 * Module to update existing price oracle cron entry.
 *
 * @module executables/oneTimers/stableCoinStaking/updateExistingPriceOracleCronEntry
 */

const program = require('commander');

const rootPrefix = '../../..',
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--auxChainId <auxChainId>', 'aux chainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/oneTimers/stableCoinStaking/updateExistingPriceOracleCronEntry.js --auxChainId 2000'
  );
  logger.log('');
  logger.log('');
});

if (!program.auxChainId) {
  program.help();
  process.exit(1);
}

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

    oThis.insertId = 0;
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

    await oThis._fetchExistingCronEntry();

    return oThis._updateCronParams();
  }

  /**
   * Fetch existing cron entry.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchExistingCronEntry() {
    const oThis = this;

    const existingCronEntry = await new CronProcessModel()
      .select('*')
      .where({
        kind_name: cronProcessesConstants.updatePriceOraclePricePoints
      })
      .fire();

    for (let index = 0; index < existingCronEntry.length; index++) {
      const cronEntity = existingCronEntry[index];

      const cronParams = JSON.parse(cronEntity.params);

      if (Number(cronParams.auxChainId) === Number(oThis.auxChainId)) {
        oThis.insertId = cronParams.id;
      }
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

    if (oThis.insertId === 0) {
      logger.error(`Could not find any price oracle cron entry for the given auxChainId ${oThis.auxChainId}. Exiting.`);

      return Promise.reject(
        new Error(`Could not find any price oracle cron entry for the given auxChainId ${oThis.auxChainId}. Exiting.`)
      );
    }

    const cronParams = {
      auxChainId: oThis.auxChainId,
      baseCurrency: 'OST'
    };
    const stringifiedCronParams = JSON.stringify(cronParams);

    await new CronProcessModel()
      .update({ params: stringifiedCronParams })
      .where({
        id: oThis.insertId
      })
      .fire();

    return responseHelper.successWithData({ id: oThis.insertId, updatedCronParams: stringifiedCronParams });
  }
}

new UpdateExistingPriceOracleCronEntry(program.auxChainId).perform().then((response) => {
  if (response.isFailure()) {
    logger.error(`One-timer failed. Response: ${JSON.stringify(response)}`);
    process.exit(1);
  }
  logger.win(`One-timer finished. Response: ${JSON.stringify(response)}`);
  process.exit(0);
});
