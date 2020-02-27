const rootPrefix = '../../..',
  BaseMetaFormatter = require(rootPrefix + '/lib/formatter/meta/Base');

/**
 * Class for user redemptions list meta formatter.
 *
 * @class UserRedemptionListMetaFormatter
 */
class UserRedemptionListMetaFormatter extends BaseMetaFormatter {
  /**
   * Append service specific keys in meta.
   *
   * @param {object} meta
   *
   * @private
   */
  _appendSpecificMetaData(meta) {
    return meta;
  }
}

module.exports = UserRedemptionListMetaFormatter;
