const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  RuleFormatter = require(rootPrefix + '/lib/formatter/entity/Rule');

/* Get rules */
router.get('/', function(req, res, next) {
  req.decodedParams.apiName = apiName.getRules;
  req.decodedParams.clientConfigStrategyRequired = false;
  const dataFormatterFunc = async function(serviceResponse) {
    let rules = serviceResponse.data[resultType.rules],
      formattedRules = [];

    for (let index in rules) {
      formattedRules.push(new RuleFormatter(rules[index]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.rules,
      [resultType.rules]: formattedRules
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/rule/Get', 'r_v2_r_1', null, dataFormatterFunc));
});

module.exports = router;
