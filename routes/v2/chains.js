const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  ChainFormatter = require(rootPrefix + '/lib/formatter/entity/Chain'),
  PricePointsFormatter = require(rootPrefix + '/lib/formatter/entity/PricePoints');

/* Get chain details*/
router.get('/:chain_id', function(req, res, next) {
  req.decodedParams.apiName = apiName.getChain;
  req.decodedParams.chain_id = req.params.chain_id;
  req.decodedParams.clientConfigStrategyRequired = false;

  const dataFormatterFunc = async function(serviceResponse) {
    const chainFormattedRsp = new ChainFormatter(serviceResponse.data[resultType.chain]).perform();
    serviceResponse.data = {
      result_type: resultType.chain,
      [resultType.chain]: chainFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/chain/Get', 'r_v2_c_1', null, dataFormatterFunc));
});

/* Get price points*/
router.get('/:chain_id/price-points', function(req, res, next) {
  req.decodedParams.apiName = apiName.getPricePoints;
  req.decodedParams.clientConfigStrategyRequired = false;

  const dataFormatterFunc = async function(serviceResponse) {
    const PricePointsFormatterRsp = await new PricePointsFormatter(serviceResponse.data).perform();

    serviceResponse.data = {
      result_type: resultType.pricePoint,
      [resultType.pricePoint]: PricePointsFormatterRsp.data
    };
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, '/app/services/chain/PricePoints', 'r_v2_c_2', null, dataFormatterFunc)
  );
});

module.exports = router;
