const express = require('express');

const rootPrefix = '../..',
  BaseTokensFormatter = require(rootPrefix + '/lib/formatter/entity/BaseTokens'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

/* Get base tokens details*/
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getBaseTokens;
  req.decodedParams.clientConfigStrategyRequired = false;

  const dataFormatterFunc = async function(serviceResponse) {
    const baseTokensFormatterRsp = await new BaseTokensFormatter(serviceResponse.data[resultType.baseTokens]).perform();

    serviceResponse.data = {
      result_type: resultType.baseTokens,
      [resultType.baseTokens]: baseTokensFormatterRsp.data
    };
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, '/app/services/baseTokens/Get', 'r_v2_bt_1', null, dataFormatterFunc)
  );
});

module.exports = router;
