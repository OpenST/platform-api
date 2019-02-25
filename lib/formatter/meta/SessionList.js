/**
 * Formatter for sessions list meta entity to convert keys to snake case.
 *
 * @module lib/formatter/meta/SessionList
 */

const rootPrefix = '../../..',
  BaseMetaFormatter = require(rootPrefix + '/lib/formatter/meta/Base');

/**
 * Class for sessions list meta formatter
 *
 * @class SessionListMetaFormatter
 */
class SessionListMetaFormatter extends BaseMetaFormatter {
  /**
   * Constructor for sessions list meta formatter
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

module.exports = SessionListMetaFormatter;
