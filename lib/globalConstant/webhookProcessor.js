/**
 * Module for webhook processor constants.
 *
 * @module lib/globalConstant/webhookProcessor
 */

/**
 * Class for webhook processor constants.
 *
 * @class WebhookProcessorConstants
 */
class WebhookProcessorConstants {
  get topics() {
    return ['webhookProcessor'];
  }

  get publisher() {
    return 'OST-Webhooks';
  }

  get messageKind() {
    return 'webhooksProcessor';
  }
}

module.exports = new WebhookProcessorConstants();
