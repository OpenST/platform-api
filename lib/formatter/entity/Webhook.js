'use strict';
/**
 * Formatter for webhook entity.
 *
 * @module lib/formatter/entity/Webhook
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class for webhook formatter.
 *
 * @class WebhookFormatter
 */
class WebhookFormatter {
  /**
   * @constructor
   *
   * @param {Object} params
   * @param {String} params.id
   * @param {String} params.url
   * @param {String} params.status
   * @param {Array} params.topics
   * @param {String} params.updatedAt
   * @param {String} [params.secret]
   */
  constructor(params) {
    const oThis = this;
    oThis.params = params;
  }

  /**
   * Main performer method for the class.
   *
   */
  perform() {
    const oThis = this,
      formattedWebhookData = {};

    if (
      !oThis.params.hasOwnProperty('id') ||
      !oThis.params.hasOwnProperty('url') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('topics') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_w_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { webhookParams: oThis.params }
        })
      );
    }

    formattedWebhookData['id'] = oThis.params.id;
    formattedWebhookData['url'] = oThis.params.url;
    formattedWebhookData['format'] = 'json';
    formattedWebhookData['status'] = oThis.params.status;
    formattedWebhookData['updated_timestamp'] = Number(oThis.params.updatedTimestamp);

    if (oThis.params.secret) {
      formattedWebhookData['secret'] = oThis.params.secret;
    }

    formattedWebhookData['topics'] = [];

    for (let index = 0; index < oThis.params.topics.length; index++) {
      const topicInt = oThis.params.topics[index];
      formattedWebhookData['topics'].push(webhookSubscriptionConstants.topics[topicInt]);
    }

    return responseHelper.successWithData(formattedWebhookData);
  }
}

module.exports = WebhookFormatter;
