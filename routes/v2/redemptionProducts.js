const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  UserListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/UserList'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/services/redemptionProduct/GetList');
require(rootPrefix + '/app/services/redemptionProduct/GetByProductId');

/* Get all redemption products*/
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getRedemptionProductsList;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    let users = serviceResponse.data[resultType.users],
      formattedRedemptionProducts = [],
      metaPayload = await new UserListMetaFormatter(serviceResponse.data).perform().data;

    for (let index in users) {
      formattedRedemptionProducts.push(await new UserFormatter(users[index]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.redemptionProducts,
      [resultType.redemptionProducts]: formattedRedemptionProducts,
      [resultType.meta]: metaPayload
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUserList', 'r_v2_rp_1', null, dataFormatterFunc));
});

/* Get redemption product by product id*/
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getRedemptionProducts;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    serviceResponse.data = {
      result_type: resultType.redemptionProduct,
      [resultType.redemptionProduct]: serviceResponse.data[resultType.redemptionProduct]
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUserList', 'r_v2_rp_2', null, dataFormatterFunc));
});

module.exports = router;
