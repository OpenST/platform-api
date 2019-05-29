/**
 * Module for preprocessor publish.
 *
 * @module lib/webhooks/PreProcessorPublish
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  webhookPreprocessorConstants = require(rootPrefix + '/lib/globalConstant/webhookPreprocessor');

/**
 * Class for preprocessor publish.
 *
 * @class PreProcessorPublish
 */
class PreProcessorPublish {
  /**
   * Main performer for class.
   *
   * @param {number} auxChainId
   * @param {object} payload
   * @param {object} [options]
   * @param {number/string} [options.workflowId]
   *
   * @returns {Promise<void>}
   */
  async perform(auxChainId, payload, options = {}) {
    const rmqConnection = await rabbitmqProvider.getInstance(rabbitmqConstants.auxWebhooksPreprocessorRabbitmqKind, {
      auxChainId: auxChainId,
      connectionWaitSeconds: connectionTimeoutConstants.crons,
      switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons
    });

    const messageParams = {
      topics: webhookPreprocessorConstants.topics,
      publisher: webhookPreprocessorConstants.publisher,
      message: {
        kind: webhookPreprocessorConstants.messageKind,
        payload: payload
      }
    };

    const setToRMQ = await rmqConnection.publishEvent.perform(messageParams);

    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error('Could not publish the message to RMQ.');

      const errorObject = responseHelper.error({
        internal_error_identifier: 'send_preprocessor_webhook_failed:l_w_ppp_1',
        api_error_identifier: 'send_preprocessor_webhook_failed',
        debug_options: { workflowId: options.workflowId, messageParams: messageParams.message }
      });

      await createErrorLogsEntry.perform(errorObject, errorLogsConstants.mediumSeverity);
    }
  }
}

module.exports = new PreProcessorPublish();
