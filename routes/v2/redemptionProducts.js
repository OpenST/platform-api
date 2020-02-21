const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  RedemptionProductFormatter = require(rootPrefix + '/lib/formatter/entity/RedemptionProduct'),
  RedemptionProductListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/RedemptionProductList'),
  RedemptionProductExtendedFormatter = require(rootPrefix + '/lib/formatter/entity/RedemptionProductExtended'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/redemption/product/GetById');
require(rootPrefix + '/app/services/redemption/product/GetList');

/* Get all redemption products. */
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getRedemptionProductsList;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const redeemableSkus = serviceResponse.data[resultType.redeemableSkus],
      formattedRedemptionProducts = [],
      metaPayload = await new RedemptionProductListMetaFormatter(serviceResponse.data).perform().data;

    for (const index in redeemableSkus) {
      formattedRedemptionProducts.push(await new RedemptionProductFormatter(redeemableSkus[index]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.redeemableSkus,
      [resultType.redeemableSkus]: formattedRedemptionProducts,
      [resultType.meta]: metaPayload
    };
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, 'GetRedemptionProductList', 'r_v2_rp_1', null, dataFormatterFunc)
  );
});

/* Get redemption product by product id. */
router.get('/:redemption_product_id', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getRedemptionProduct;

  // TODO - redemption - client config strategy not needed. Remove the service class from ic.
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.redemption_product_id = req.params.redemption_product_id; // The redemption_product_id from URL params.

  const dataFormatterFunc = async function(serviceResponse) {
    // TODO - redemption - why are we using resultType and not entity type constants
    // TODO - redemption - redeemableSku should not be used inside code.
    const formattedRedemptionProduct = await new RedemptionProductExtendedFormatter(
      serviceResponse.data[resultType.redeemableSku]
    ).perform().data;

    serviceResponse.data = {
      // TODO - redemption - why are we using resultType and not entity type constants
      // TODO - redemption - redeemableSku should not be used inside code.
      result_type: resultType.redeemableSku,
      [resultType.redeemableSku]: formattedRedemptionProduct
    };
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, 'GetRedemptionProductById', 'r_v2_rp_2', null, dataFormatterFunc)
  );
});

module.exports = router;
