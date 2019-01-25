const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/token/StartMint');

router.post('/deploy', function(req, res, next) {
  req.decodedParams.apiName = 'tokenDeployment';
  req.decodedParams.configStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/token/Deployment', 'r_it_1'));
});

router.post('/mint', function(req, res, next) {
  req.decodedParams.apiName = 'startMint';
  req.decodedParams.clientConfigStrategyRequired = true;

  Promise.resolve(routeHelper.perform(req, res, next, 'StartMint', 'r_it_2'));
});

router.get('/mint-details', function(req, res, next) {
  req.decodedParams.apiName = 'mintDetails';
  req.decodedParams.configStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/token/Mint', 'r_it_3'));
});

router.get('/grant', function(req, res, next) {
  req.decodedParams.apiName = 'grantEthOst';
  req.decodedParams.configStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, 'app/services/token/GrantEthOst', 'r_it_4'));
});

module.exports = router;
