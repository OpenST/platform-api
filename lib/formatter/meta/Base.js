/**
 * Formatter for Meta Base
 *
 * @module lib/formatter/meta/Base
 */

const rootPrefix = '../../..',
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for Meta formatter.
 *
 * @class
 */
class BaseMetaFormatter {
  /**
   * Constructor for Meta
   *
   * @param {Object} params
   * @param {Object} params.meta
   * @param {Object} [params.meta.next_page_payload]
   * @param {String} [params.meta.next_page_payload.pagination_identifier]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;

    oThis.paginationIdentifierPresent = null;
  }

  /**
   * Perform
   *
   * @return {{}}
   */
  perform() {
    const oThis = this;

    let meta = oThis._constructMeta();

    return responseHelper.successWithData(meta);
  }

  /**
   * Construct meta object
   *
   * @return {*}
   *
   * @private
   */
  _constructMeta() {
    const oThis = this;

    let meta = {
      [pagination.nextPagePayloadKey]: {}
    };

    if (oThis._isPaginationIdentifierPresent()) {
      let paginationIdentifier = oThis.params[pagination.nextPagePayloadKey][pagination.paginationIdentifierKey];
      meta[pagination.nextPagePayloadKey][pagination.paginationIdentifierKey] =
        basicHelper.encryptPageIdentifier(paginationIdentifier);
    }

    meta = oThis._appendSpecificMetaData(meta);

    return meta;
  }

  /**
   * Check if pagination identifier present or not
   *
   * @private
   */
  _isPaginationIdentifierPresent() {
    const oThis = this;
    
    if (oThis.paginationIdentifierPresent == null) {
      let nextPagePayload = oThis.params[pagination.nextPagePayloadKey] || {};
      oThis.paginationIdentifierPresent = nextPagePayload[pagination.paginationIdentifierKey] ? true : false;
    }

    return oThis.paginationIdentifierPresent;
  }

  /**
   * Append service specific keys in meta
   *
   * @param meta
   * @private
   */
  _appendSpecificMetaData(meta) {
    throw new Error('sub class to implement.');
  }
}

module.exports = BaseMetaFormatter;
