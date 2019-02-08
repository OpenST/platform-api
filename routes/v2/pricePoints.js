const express = require('express');

const rootPrefix = '../..',
  PricePointsFormatter = require(rootPrefix + '/lib/formatter/entity/PricePoints'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

/* Get tokens details*/
router.get('/', function(req, res, next) {
  req.decodedParams.apiName = apiName.getPricePoints;
  req.decodedParams.clientConfigStrategyRequired = false;

  const dataFormatterFunc = async function(serviceResponse) {
    const PricePointsFormatterRsp = await new PricePointsFormatter(serviceResponse.data).perform();

    serviceResponse.data = {
      result_type: resultType.pricePoints,
      [resultType.pricePoints]: PricePointsFormatterRsp.data
    };
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, '/app/services/pricePoints/get', 'r_pp_1', null, dataFormatterFunc)
  );
});

module.exports = router;
