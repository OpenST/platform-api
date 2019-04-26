const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/token/StartMint');
require(rootPrefix + '/app/services/token/getDashboardDetails');
require(rootPrefix + '/app/services/contracts/GatewayComposer');

router.post('/deploy', function(req, res, next) {
  req.decodedParams.apiName = 'tokenDeployment';
  req.decodedParams.clientConfigStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/token/Deployment', 'r_it_1'));
});

router.post('/mint', function(req, res, next) {
  req.decodedParams.apiName = 'startMint';
  req.decodedParams.clientConfigStrategyRequired = true;

  Promise.resolve(routeHelper.perform(req, res, next, 'StartMint', 'r_it_2'));
});

router.get('/mint-details', function(req, res, next) {
  req.decodedParams.apiName = 'mintDetails';
  req.decodedParams.clientConfigStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/token/Mint', 'r_it_3'));
});

router.get('/mint/grant', function(req, res, next) {
  req.decodedParams.apiName = 'grantEthStakeCurrency';
  req.decodedParams.clientConfigStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/token/GrantEthStakeCurrency', 'r_it_4'));
});

router.get('/get-dashboard', function(req, res, next) {
  req.decodedParams.apiName = 'tokenDashboard';
  req.decodedParams.clientConfigStrategyRequired = true;

  Promise.resolve(routeHelper.perform(req, res, next, 'GetTokenDashboardDetail', 'r_it_5'));
});

router.get('/generate-known-address', function(req, res, next) {
  req.decodedParams.apiName = 'generateKnownAddress';
  req.decodedParams.clientConfigStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/token/GenerateKnownAddress', 'r_it_6'));
});

router.post('/remove-known-address', function(req, res, next) {
  req.decodedParams.apiName = 'removeKnownAddress';
  req.decodedParams.clientConfigStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/token/RemoveKnownAddress', 'r_it_7'));
});

router.get('/pre-mint', function(req, res, next) {
  req.decodedParams.apiName = 'preMint';
  req.decodedParams.clientConfigStrategyRequired = true;

  Promise.resolve(routeHelper.perform(req, res, next, 'GatewayComposer', 'r_it_8'));
});

module.exports = router;
