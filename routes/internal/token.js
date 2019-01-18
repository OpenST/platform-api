const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/token/Deployment');
require(rootPrefix + '/app/services/token/aggregatedDetails');

/* Get aggregated token details*/
router.get('/details', function(req, res, next) {
  req.decodedParams.apiName = 'tokenDetailsAggregated';

  Promise.resolve(routeHelper.perform(req, res, next, 'TokenAggregatedDetails', 'r_it_1'));
});

router.post('/deploy', function(req, res, next) {
  req.decodedParams.apiName = 'tokenDeployment';

  Promise.resolve(routeHelper.perform(req, res, next, 'TokenDeployment', 'r_it_2'));
});

router.post('/mint', function(req, res, next) {
  req.decodedParams.apiName = 'startMint';

  Promise.resolve(routeHelper.perform(req, res, next, 'StartMint', 'r_it_3'));
});
module.exports = router;
