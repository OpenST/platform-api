/**
 * Module for webhook entity formatter.
 *
 * @module lib/formatter/entity/Webhook
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  webhookEndpointsConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoints'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Declare constants.
const hasOwnProperty = Object.prototype.hasOwnProperty; // Cache the lookup once, in module scope.

/**
 * Class for webhook entity formatter.
 *
 * @class WebhookFormatter
 */
class WebhookFormatter {
  /**
   * Constructor for webhook entity formatter.
   *
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.url
   * @param {string} params.status
   * @param {array} params.topics
   * @param {string} params.updatedAt
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<never>|*|result}
   */
  perform() {
    const oThis = this;

    if (
      !hasOwnProperty.call(oThis.params, 'id') ||
      !hasOwnProperty.call(oThis.params, 'url') ||
      !hasOwnProperty.call(oThis.params, 'status') ||
      !hasOwnProperty.call(oThis.params, 'topics') ||
      !hasOwnProperty.call(oThis.params, 'updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_w_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { webhookParams: oThis.params }
        })
      );
    }

    const formattedWebhookData = {
      id: oThis.params.id,
      url: oThis.params.url,
      format: 'json',
      status: webhookEndpointsConstants.statuses[oThis.params.status],
      updated_timestamp: Number(oThis.params.updatedTimestamp),
      topics: []
    };

    for (let index = 0; index < oThis.params.topics.length; index++) {
      const topicKind = oThis.params.topics[index];
      formattedWebhookData.topics.push(webhookSubscriptionsConstants.topics[topicKind]);
    }

    return responseHelper.successWithData(formattedWebhookData);
  }
}

module.exports = WebhookFormatter;
