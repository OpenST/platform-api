const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const router = express.Router();

require(rootPrefix + '/app/services/user/get/ById');

router.get('/get', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserInternal;
  req.decodedParams.clientConfigStrategyRequired = true;

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUser', 'r_i_u_1', null, null));
});

router.post('/testW', function(req, res, next) {
  res.status(200).json(responseHelper.successWithData({ my: 'response done' }));
});

module.exports = router;
