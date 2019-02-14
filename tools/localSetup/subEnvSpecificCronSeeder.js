/**
 * Class to seed sub environment specific cron seeder.
 *
 * @module tools/localSetup/subEnvSpecificCronSeeder
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  EmailNotifier = require(rootPrefix + '/lib/cronProcess/EmailNotifier'),
  WorkflowWorker = require(rootPrefix + '/lib/cronProcess/WorkflowWorker'),
  UpdateRealtimeGasPrice = require(rootPrefix + '/lib/cronProcess/UpdateRealtimeGasPrice');

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
    logger.log('Creating workflowWorker');
    const workflowWorker = new WorkflowWorker({
      prefetchCount: 5,
      chainId: 0,
      sequenceNumber: 1
    });
    return workflowWorker.perform().then(console.log);
  }

  /**
   * Insert emailNotifier cron entry.
   *
   * @return {Promise<*>}
   */
  async insertEmailNotifierEntry() {
    logger.log('Creating emailNotifier');
    const emailNotifier = new EmailNotifier({
      chainId: 0
    });
    return emailNotifier.perform().then(console.log);
  }

  /**
   * Insert updateRealtimeGasPrice cron entry.
   *
   * @return {Promise<*>}
   */
  async insertUpdateRealtimeGasPriceEntry() {
    logger.log('Creating updateRealtimeGasPrice');
    const updateRealtimeGasPrice = new UpdateRealtimeGasPrice({
      chainId: 0
    });
    return updateRealtimeGasPrice.perform().then(console.log);
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
