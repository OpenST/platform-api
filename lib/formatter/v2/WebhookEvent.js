/**
 * Module for webhook event formatter.
 *
 * @module lib/formatter/entity/Device
 */

const rootPrefix = '../../..',
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device'),
  SessionFormatter = require(rootPrefix + '/lib/formatter/entity/Session'),
  TokenHolderFormatter = require(rootPrefix + '/lib/formatter/entity/TokenHolder'),
  TransactionFormatter = require(rootPrefix + '/lib/formatter/entity/Transaction'),
  PricePointsFormatter = require(rootPrefix + '/lib/formatter/entity/PricePoints'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookEndpointsConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoints'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class for webhook event formatter.
 *
 * @class WebhookEventFormatter
 */
class WebhookEventFormatter {
  /**
   * Constructor for webhook event formatter.
   *
   * @param {object} params
   * @param {object} params.pendingWebhook
   * @param {object} params.rawWebhook
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.pendingWebhook = params.pendingWebhook;
    oThis.rawWebhook = params.rawWebhook;

    oThis.entityResultType = oThis.pendingWebhook.extraData.entityResultType;
    oThis.webhookEntity = null;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<null>}
   */
  async perform() {
    const oThis = this;

    oThis._createWebhookEntity();

    await oThis._addEntity();

    return oThis.webhookEntity;
  }

  /**
   * Create webhook entity.
   *
   * @sets oThis.webhookEntity
   *
   * @private
   */
  _createWebhookEntity() {
    const oThis = this;

    oThis.webhookEntity = {
      id: oThis.pendingWebhook.eventUuid,
      topic: webhookSubscriptionConstants.topics[oThis.pendingWebhook.webhookTopicKind],
      created_at: Number(oThis.pendingWebhook.createdAt),
      webhook_id: oThis.rawWebhook.uuid, // Uuid v4 for webhook subscription data.
      version: webhookEndpointsConstants.apiVersions[oThis.rawWebhook.apiVersion], // This is webhook response data version, it is expected to with API version which is v2.0 at the time of writing this document.
      data: {}
    };
  }

  /**
   * Add response entity.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _addEntity() {
    const oThis = this;

    let formattedEntity = null;

    switch (oThis.entityResultType) {
      case resultType.device: {
        formattedEntity = new DeviceFormatter(oThis.pendingWebhook.extraData.rawEntity).perform();
        break;
      }
      case resultType.transaction: {
        formattedEntity = new TransactionFormatter(oThis.pendingWebhook.extraData.rawEntity).perform();
        break;
      }
      case resultType.user: {
        formattedEntity = new UserFormatter(oThis.pendingWebhook.extraData.rawEntity).perform();
        break;
      }
      case resultType.session: {
        formattedEntity = new SessionFormatter(oThis.pendingWebhook.extraData.rawEntity).perform();
        break;
      }
      case resultType.tokenHolder: {
        formattedEntity = new TokenHolderFormatter(oThis.pendingWebhook.extraData.rawEntity).perform();
        break;
      }
      case resultType.pricePoint: {
        formattedEntity = await new PricePointsFormatter(oThis.pendingWebhook.extraData.rawEntity).perform();
        break;
      }
      default: {
        throw new Error('Unrecognized entity.');
      }
    }

    oThis.webhookEntity.data = {
      result_type: oThis.entityResultType,
      [oThis.entityResultType]: formattedEntity.data
    };
  }
}

module.exports = WebhookEventFormatter;
