'use strict';
/**
 * Formatter for Device entity.
 *
 * @module lib/formatter/entity/Device
 */
const rootPrefix = '../../..',
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
  webhookEndpointConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoints'),
  TransactionFormatter = require(rootPrefix + '/lib/formatter/entity/Transaction'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for device formatter.
 *
 * @class WebhookEventFormatter
 */
class WebhookEventFormatter {
  constructor(params) {
    const oThis = this;

    oThis.pendingWebhook = params.pendingWebhook;
    oThis.rawWebhook = params.rawWebhook;

    oThis.entityResultType = oThis.pendingWebhook.extraData.entityResultType;
    oThis.webhookEntity = null;
  }

  perform() {
    const oThis = this;
    oThis._createWebhookEntity();
    oThis._addEntity();

    return oThis.webhookEntity;
  }

  _createWebhookEntity() {
    const oThis = this;

    oThis.webhookEntity = {
      id: oThis.pendingWebhook.eventUuid,
      topic: webhookSubscriptionConstants.topics[oThis.pendingWebhook.webhookTopicKind],
      created_at: Number(basicHelper.dateToSecondsTimestamp(oThis.pendingWebhook.createdAt)),
      webhook_id: oThis.rawWebhook.uuid, //uuid v4 for webhook subscription data
      version: String(oThis.rawWebhook.apiVersion), // This is webhook response data version, it is expected to with API verison which is v2.0 at the time of writing this document.
      data: {}
    };
  }

  _addEntity() {
    const oThis = this;

    let formattedEntity = null;

    switch (oThis.entityResultType) {
      case resultType.device:
        console.log('resultType---', resultType.device);
        formattedEntity = new DeviceFormatter(oThis.pendingWebhook.extraData.rawEntity).perform();
        break;

      case resultType.transaction:
        console.log('resultType---', resultType.transaction);
        formattedEntity = new TransactionFormatter(oThis.pendingWebhook.extraData.rawEntity).perform();
        break;

      default:
        throw 'unknown entity asked';
    }

    oThis.webhookEntity.data = {
      result_type: oThis.entityResultType,
      [oThis.entityResultType]: formattedEntity.data
    };
  }
}

module.exports = WebhookEventFormatter;
