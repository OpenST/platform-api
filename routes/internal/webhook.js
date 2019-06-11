const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName');

const router = express.Router();

require(rootPrefix + '/app/services/webhooks/RotateSecret');
require(rootPrefix + '/app/services/webhooks/DeleteGraceSecret');

router.get('/rotate-secret', function(req, res, next) {
  req.decodedParams.apiName = apiName.rotateWebhookSecretInternal;
  req.decodedParams.clientConfigStrategyRequired = true;

  Promise.resolve(routeHelper.perform(req, res, next, 'RotateWebhookSecretInternal', 'r_i_w_1', null, null));
});

router.get('/delete-grace-secret', function(req, res, next) {
  req.decodedParams.apiName = apiName.deleteWebhookGraceSecretInternal;
  req.decodedParams.clientConfigStrategyRequired = true;

  Promise.resolve(routeHelper.perform(req, res, next, 'DeleteWebhookGraceSecretInternal', 'r_i_w_2', null, null));
});

module.exports = router;
