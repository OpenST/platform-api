const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  RedemptionProductFormatter = require(rootPrefix + '/lib/formatter/entity/RedemptionProduct'),
  RedemptionProductListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/RedemptionProductList'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/services/redemption/product/GetById');
require(rootPrefix + '/app/services/redemption/product/GetList');

/* Get all redemption products*/
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getRedemptionProductsList;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    let redeemableSkus = serviceResponse.data[resultType.redeemableSkus],
      formattedRedemptionProducts = [],
      metaPayload = await new RedemptionProductListMetaFormatter(serviceResponse.data).perform().data;

    console.log('redeemableSkus----', redeemableSkus);

    for (let index in redeemableSkus) {
      formattedRedemptionProducts.push(await new RedemptionProductFormatter(redeemableSkus[index]).perform().data);
    }

    console.log('formattedRedemptionProducts-----', formattedRedemptionProducts);

    serviceResponse.data = {
      result_type: resultType.redeemableSkus,
      [resultType.redeemableSkus]: formattedRedemptionProducts,
      [resultType.meta]: metaPayload
    };

    console.log('serviceResponse------', JSON.stringify(serviceResponse));
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, 'GetRedemptionProductList', 'r_v2_rp_1', null, dataFormatterFunc)
  );
});

/* Get redemption product by product id*/
router.get('/:redeemable_sku_id', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getRedemptionProduct;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.redemption_product_id = req.params.redeemable_sku_id; // The redeemable_sku_id from URL params

  const dataFormatterFunc = async function(serviceResponse) {
    let formattedRedemptionProduct = await new RedemptionProductFormatter(
      serviceResponse.data[resultType.redeemableSku]
    ).perform().data;

    serviceResponse.data = {
      result_type: resultType.redeemableSku,
      [resultType.redeemableSku]: formattedRedemptionProduct
    };
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, 'GetRedemptionProductById', 'r_v2_rp_2', null, dataFormatterFunc)
  );
});

module.exports = router;
