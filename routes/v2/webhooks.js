const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  WebhookListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/WebhookList'),
  WebhookFormatter = require(rootPrefix + '/lib/globalConstant/apiSignature');

require(rootPrefix + '/app/services/webhooks/modify/Create');
require(rootPrefix + '/app/services/webhooks/modify/Update');
require(rootPrefix + '/app/services/webhooks/Get');
require(rootPrefix + '/app/services/webhooks/GetAll');
require(rootPrefix + '/app/services/webhooks/Delete');

/* Create webhook */
router.post('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.createWebhook;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const webhookFormattedRsp = await new WebhookFormatter(serviceResponse.data[resultType.webhook]).perform();
    serviceResponse.data = {
      result_type: resultType.webhook,
      [resultType.webhook]: webhookFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateWebhook', 'r_v2_w_1', null, dataFormatterFunc));
});

/* Update webhook */
router.post('/:webhook_id', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.updateWebhook;
  req.decodedParams.webhook_id = req.params.webhook_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const webhookFormattedRsp = await new WebhookFormatter(serviceResponse.data[resultType.webhook]).perform();
    serviceResponse.data = {
      result_type: resultType.webhook,
      [resultType.webhook]: webhookFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'UpdateWebhook', 'r_v2_w_2', null, dataFormatterFunc));
});

/* Update webhook */
router.get('/:webhook_id', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getWebhook;
  req.decodedParams.webhook_id = req.params.webhook_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const webhookFormattedRsp = await new WebhookFormatter(serviceResponse.data[resultType.webhook]).perform();
    serviceResponse.data = {
      result_type: resultType.webhook,
      [resultType.webhook]: webhookFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetWebhook', 'r_v2_w_3', null, dataFormatterFunc));
});

/* Delete a webhook */
router.delete('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.deleteWebhook;
  req.decodedParams.clientConfigStrategyRequired = false;

  const dataFormatterFunc = async function(serviceResponse) {
    const webhookFormattedRsp = await new WebhookFormatter(serviceResponse.data[resultType.webhook]).perform();
    serviceResponse.data = {
      result_type: resultType.webhook,
      [resultType.webhook]: webhookFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'DeleteWebhook', 'r_v2_w_4', null, dataFormatterFunc));
});

/* Create webhook */
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getAllWebhook;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const webhooks = serviceResponse.data[resultType.webhook],
      formattedWebhooks = [],
      metaPayload = await new WebhookListMetaFormatter(serviceResponse.data).perform().data;

    for (let index in webhooks) {
      formattedWebhooks.push(await new WebhookFormatter(webhooks[index]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.webhook,
      [resultType.webhook]: formattedWebhooks,
      [resultType.meta]: metaPayload
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetAllWebhook', 'r_v2_w_5', null, dataFormatterFunc));
});
