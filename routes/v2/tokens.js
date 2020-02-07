const express = require('express');

const rootPrefix = '../..',
  TokenFormatter = require(rootPrefix + '/lib/formatter/entity/Token'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/token/Detail');

/* Get tokens details*/
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getToken;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const tokensFormatterRsp = await new TokenFormatter(serviceResponse.data[resultType.token]).perform();

    serviceResponse.data = {
      result_type: resultType.token,
      [resultType.token]: tokensFormatterRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'TokenDetail', 'r_v2_t_1', null, dataFormatterFunc));
});

/* Token domain validation */
router.get('/:token_id/validate-domain', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.verifyTokenDomain;
  req.decodedParams.clientConfigStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/token/VerifyDomain', 'r_v2_t_2', null, null));
});

module.exports = router;
