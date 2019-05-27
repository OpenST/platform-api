const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper');

/* Create webhook */
router.post('/webhooks', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.createWebhook;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = await new UserFormatter(serviceResponse.data[resultType.user]).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateWebhook', 'r_v2_u_1', null, dataFormatterFunc));
});
