/**
 * Formatter for devices list meta entity to convert keys to snake case.
 *
 * @module lib/formatter/meta/DeviceList
 */

const rootPrefix = '../../..',
  BaseMetaFormatter = require(rootPrefix + '/lib/formatter/meta/Base');

/**
 * Class for devices list meta formatter
 *
 * @class DeviceListMetaFormatter
 */
class DeviceListMetaFormatter extends BaseMetaFormatter {
  /**
   * Constructor for devices list meta formatter
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

module.exports = DeviceListMetaFormatter;
