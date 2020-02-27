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

/* Get all redemption products. */
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getRedemptionProductsList;
  req.decodedParams.clientConfigStrategyRequired = false;

  const dataFormatterFunc = async function(serviceResponse) {
    const redemptionProducts = serviceResponse.data[resultType.redemptionProducts],
      formattedRedemptionProducts = [],
      metaPayload = await new RedemptionProductListMetaFormatter(serviceResponse.data).perform().data;

    for (const index in redemptionProducts) {
      formattedRedemptionProducts.push(new RedemptionProductFormatter(redemptionProducts[index]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.redemptionProducts,
      [resultType.redemptionProducts]: formattedRedemptionProducts,
      [resultType.meta]: metaPayload
    };
  };

  Promise.resolve(
    routeHelper.perform(
      req,
      res,
      next,
      '/app/services/redemption/product/GetList',
      'r_v2_rp_1',
      null,
      dataFormatterFunc
    )
  );
});

/* Get redemption product by product id. */
router.get('/:redemption_product_id', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getRedemptionProduct;
  req.decodedParams.clientConfigStrategyRequired = false;
  req.decodedParams.redemption_product_id = req.params.redemption_product_id; // The redemption_product_id from URL params.

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRedemptionProduct = new RedemptionProductExtendedFormatter(
      serviceResponse.data[resultType.redemptionProduct]
    ).perform().data;

    serviceResponse.data = {
      result_type: resultType.redemptionProduct,
      [resultType.redemptionProduct]: formattedRedemptionProduct
    };
  };

  Promise.resolve(
    routeHelper.perform(
      req,
      res,
      next,
      '/app/services/redemption/product/GetById',
      'r_v2_rp_2',
      null,
      dataFormatterFunc
    )
  );
});

module.exports = router;
