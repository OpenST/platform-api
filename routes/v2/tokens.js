const express = require('express');

const rootPrefix = '../..',
  TokensFormatter = require(rootPrefix + '/lib/formatter/entity/Tokens'),
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/token/Detail');

/* Get tokens details*/
router.get('/', function(req, res, next) {
  req.decodedParams.apiName = 'tokenDetails';
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    console.log('serviceResponse--------', serviceResponse);

    const TokensFormatterRsp = await new TokensFormatter(serviceResponse.data).perform();

    console.log('TokensFormatterRsp---------', TokensFormatterRsp);
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'TokenDetail', 'r_t_1', null, dataFormatterFunc));
});

module.exports = router;
