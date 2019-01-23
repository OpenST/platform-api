const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/token/Detail');

/* Get aggregated token details*/
router.get('/', function(req, res, next) {
  req.decodedParams.apiName = 'tokenDetails';
  Promise.resolve(routeHelper.perform(req, res, next, 'TokenDetail', 'r_t_1'));
});

module.exports = router;
