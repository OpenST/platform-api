/**
 * Formatter for redemption product list meta entity to convert keys to snake case.
 *
 * @module lib/formatter/meta/RedemptionProductList
 */

const rootPrefix = '../../..',
  BaseMetaFormatter = require(rootPrefix + '/lib/formatter/meta/Base');

/**
 * Class for redemption product list meta formatter.
 *
 * @class RedemptionProductListFormatter
 */
class RedemptionProductListFormatter extends BaseMetaFormatter {
  /**
   * Constructor for redemption product list meta formatter.
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Append service specific keys in meta
   *
   * @param meta
   * @private
   */
  _appendSpecificMetaData(meta) {
    return meta;
  }
}

module.exports = RedemptionProductListFormatter;
