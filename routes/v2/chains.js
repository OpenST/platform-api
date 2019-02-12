const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  ChainFormatter = require(rootPrefix + '/lib/formatter/entity/Chain');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/services/chain/Get');

/* Get chain details*/
router.get('/:chain_id', function(req, res, next) {
  req.decodedParams.apiName = apiName.getChain;
  req.decodedParams.chain_id = req.params.chain_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const chainFormattedRsp = new ChainFormatter(serviceResponse.data[resultType.chain]).perform();
    serviceResponse.data = {
      result_type: resultType.chain,
      [resultType.chain]: chainFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetChain', 'r_v_c_1', null, dataFormatterFunc));
});

module.exports = router;
