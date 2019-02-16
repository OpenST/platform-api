/**
 * Formatter for NextPagePayload entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/NextPagePayload
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination');

/**
 * Class for NextPagePayload formatter.
 *
 * @class
 */
class NextPagePayloadFormatter {
  /**
   * Constructor for NextPagePayload formatter.
   *
   * @param {Object} [params]
   * @param {String} [params.pagination_identifier]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params || {};
  }

  /**
   * Perform
   *
   * @return {{}}
   */
  perform() {
    const oThis = this;

    let formattedNextPagePayloadData = {};

    formattedNextPagePayloadData[paginationConstants.paginationIdentifierKey] =
      oThis.params[paginationConstants.paginationIdentifierKey] || null;

    return responseHelper.successWithData(formattedNextPagePayloadData);
  }
}

module.exports = NextPagePayloadFormatter;
