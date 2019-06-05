/**
 * Module for webhook entity formatter.
 *
 * @module lib/formatter/entity/Webhook
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

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
   * @param {string} [params.secret]
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

    const formattedWebhookData = {};

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

    formattedWebhookData.id = oThis.params.id;
    formattedWebhookData.url = oThis.params.url;
    formattedWebhookData.format = 'json';
    formattedWebhookData.status = oThis.params.status;
    formattedWebhookData.updated_timestamp = Number(oThis.params.updatedTimestamp);
    formattedWebhookData.topics = oThis.params.topics;

    if (oThis.params.secret) {
      formattedWebhookData.secret = oThis.params.secret;
    }

    return responseHelper.successWithData(formattedWebhookData);
  }
}

module.exports = WebhookFormatter;
