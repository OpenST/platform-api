'use strict';

const express = require('express');

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper');

require(rootPrefix + '/app/services/test');

const router = express.Router();

/**
 * Get balance of user
 *
 * @route {GET} {base_url}/get_balance/{id}
 *
 * @routeparam {String} :id - User uuid
 *
 */
router.get('/', function(req, res, next) {
  req.decodedParams.apiName = 'test_api';
  req.decodedParams.id = req.params.id;

  console.log("req.decodedParams---------------", req.decodedParams);
  console.log("req.params---------------", req.params);
  const dataFormatterFunc = async function(response) {
    // let balanceFormatter = new test(response.data);
    // let balanceFormatterResponse = await balanceFormatter.perform();

    delete response.data;

    response.data = {};
    response.data.result_type = 'balance';
    // response.data.balance = balanceFormatterResponse.data;
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'getTestApiClass', 'r_v1_b_1', null, dataFormatterFunc));
});

module.exports = router;
