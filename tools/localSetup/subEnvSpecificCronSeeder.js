/**
 * Class to seed sub environment specific cron seeder.
 *
 * @module tools/localSetup/subEnvSpecificCronSeeder
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  InsertCrons = require(rootPrefix + '/lib/cronProcess/InsertCrons'),
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
    await oThis.insertUpdateRealtimeGasPriceEntry();
    await oThis.insertCronProcessesMonitorEntry();
    await oThis.insertRecoveryRequestsMonitorEntry();
    await oThis.insertWebhookErrorHandlerEntry();
    await oThis.insertTrackLatestTransaction();
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

  /**
   * Insert Cron Processes Monitor cron entry.
   *
   * @return {Promise<*>}
   */
  async insertCronProcessesMonitorEntry() {
    return new InsertCrons().perform(cronProcessConstants.cronProcessesMonitor, {}).then(function(insertId) {
      logger.log('InsertId: ', insertId);
    });
  }

  /**
   * Insert Recovery Requests Monitor cron entry.
   *
   * @return {Promise<*>}
   */
  async insertRecoveryRequestsMonitorEntry() {
    return new InsertCrons().perform(cronProcessConstants.recoveryRequestsMonitor, {}).then(function(insertId) {
      logger.log('InsertId: ', insertId);
    });
  }

  /**
   * Insert Webhook Error Handler cron entry.
   *
   * @return {Promise<*>}
   */
  async insertWebhookErrorHandlerEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.webhookErrorHandler, { sequenceNumber: 1 })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert track latest transaction cron entry.
   *
   * @return {Promise<*>}
   */
  async insertTrackLatestTransaction() {
    return new InsertCrons()
      .perform(cronProcessConstants.trackLatestTransaction, {
        chainId: 0,
        prefetchCount: 5,
        sequenceNumber: 1
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
