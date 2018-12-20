const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  apiVersions = require(rootPrefix + '/lib/global_constant/api_versions'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.internal);

const router = express.Router();

require(rootPrefix + '/app/services/signer/Signer');

/* Start the On-Boarding of a branded token */
router.post('/internal/token/addresses/associate', function(req, res, next) {
  req.decodedParams.apiName = 'signer';

  Promise.resolve(routeHelper.performer(req, res, next, 'Signer', 'r_is_1'));
});

module.exports = router;
