/**
 * Class to seed sub environment specific cron seeder.
 *
 * @module tools/localSetup/subEnvSpecificCronSeeder
 */

const rootPrefix = '../..',
  InsertCrons = require(rootPrefix + '/devops/exec/InsertCrons'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class to seed sub environment specific cron seeder.
 *
 * @class
 */
class SubEnvSpecificCronSeeder {
  /**
   * Main performer for class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.insertWorkflowWorkerEntry();
    await oThis.insertEmailNotifierEntry();
    await oThis.insertUpdateRealtimeGasPriceEntry();
  }

  /**
   * Insert workflowWorker cron entry.
   *
   * @return {Promise<*>}
   */
  async insertWorkflowWorkerEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.workflowWorker, {
        prefetchCount: 5,
        chainId: 0,
        sequenceNumber: 1
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert emailNotifier cron entry.
   *
   * @return {Promise<*>}
   */
  async insertEmailNotifierEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.emailNotifier, {
        chainId: 0
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert updateRealtimeGasPrice cron entry.
   *
   * @return {Promise<*>}
   */
  async insertUpdateRealtimeGasPriceEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.updateRealtimeGasPrice, {
        chainId: 0
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }
}

module.exports = SubEnvSpecificCronSeeder;

new SubEnvSpecificCronSeeder()
  .perform()
  .then(function() {
    logger.win('Sub-env specific cron entries created.');
    process.exit(0);
  })
  .catch(function(error) {
    logger.error('Sub-env specific cron entries creation failed. Error: ', error);
    process.exit(1);
  });
