/**
 * Formatter for users list meta entity to convert keys to snake case.
 *
 * @module lib/formatter/meta/UserList
 */

const rootPrefix = '../../..',
  BaseMetaFormatter = require(rootPrefix + '/lib/formatter/meta/Base');

/**
 * Class for users list meta formatter.
 *
 * @class WebhookListMetaFormatter
 */
class WebhookListMetaFormatter extends BaseMetaFormatter {
  /**
   * Constructor for users list meta formatter.
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

module.exports = WebhookListMetaFormatter;
