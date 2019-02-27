/**
 * Formatter for transactions list meta entity to convert keys to snake case.
 *
 * @module lib/formatter/meta/TransactionList
 */

const rootPrefix = '../../..',
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  BaseMetaFormatter = require(rootPrefix + '/lib/formatter/meta/Base');

/**
 * Class for transaction list meta formatter.
 *
 * @class TransactionListMetaFormatter
 */
class TransactionListMetaFormatter extends BaseMetaFormatter {
  /**
   * Constructor for transactions list meta formatter.
   *
   *
   * @param {Object} params
   * @param {Object} params.meta
   * @param {Object} [params.meta.next_page_payload]
   * @param {String} [params.meta.next_page_payload.pagination_identifier]
   * @param {Integer} [params.meta.total_no]
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.totalNo = params.meta.total_no || 0;
  }

  /**
   * Append service specific keys in meta
   *
   * @param meta
   * @returns {{total_no: (Integer)}}
   * @private
   */
  _appendSpecificMetaData(meta) {
    const oThis = this;
    meta[pagination.totalNoKey] = oThis.totalNo;
    return meta;
  }
}

module.exports = TransactionListMetaFormatter;
