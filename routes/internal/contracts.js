const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/contracts/GatewayComposer');

router.get('/gateway-composer', function(req, res, next) {
  req.decodedParams.apiName = 'gatewayComposer';
  req.decodedParams.clientConfigStrategyRequired = true;

  Promise.resolve(routeHelper.perform(req, res, next, 'GatewayComposer', 'r_ic_1'));
});
module.exports = router;
