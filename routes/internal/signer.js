const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/verifySigner/ECRecover');

/* Start the On-Boarding of a branded token */
router.post('/verify', function(req, res, next) {
  req.decodedParams.apiName = 'verifySigner';
  req.decodedParams.clientConfigStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, 'ECRecover', 'r_is_1'));
});

module.exports = router;
