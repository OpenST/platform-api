const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  WebhookFormatter = require(rootPrefix + '/lib/globalConstant/apiSignature');

require(rootPrefix + '/app/services/webhooks/modify/Create');
require(rootPrefix + '/app/services/webhooks/modify/Update');

/* Create webhook */
router.post('/webhooks', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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
router.post('/webhooks/:webhook_id', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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

/* Delete a webhook */
router.delete('/webhooks', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.deleteWebhook;
  req.decodedParams.clientConfigStrategyRequired = false;

  const dataFormatterFunc = async function(serviceResponse) {
    const webhookFormattedRsp = await new WebhookFormatter(serviceResponse.data[resultType.webhook]).perform();
    serviceResponse.data = {
      result_type: resultType.webhook,
      [resultType.webhook]: webhookFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'DeleteWebhook', 'r_v2_w_3', null, dataFormatterFunc));
});
