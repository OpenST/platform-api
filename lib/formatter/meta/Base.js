/**
 * Formatter for Meta Base
 *
 * @module lib/formatter/meta/Base
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination');

/**
 * Class for Meta formatter.
 *
 * @class
 */
class MetaFormatter {
  /**
   * Constructor for Meta
   *
   * @param {Object} params
   * @param {Object} params.next_page_payload
   * @param {String} [params.next_page_payload.pagination_identifier]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Construct meta object
   *
   * @return {{}}
   */
  _constructMeta() {
    const oThis = this;

    let meta = {
      next_page_payload: {}
    };

    if (!oThis.params.hasOwnProperty('next_page_payload')) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_m_b_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { metaParams: oThis.params }
        })
      );
    }

    let paginationIdentifierKey = oThis.params.next_page_payload[paginationConstants.paginationIdentifierKey];

    if (paginationIdentifierKey) {
      meta.next_page_payload[paginationConstants.paginationIdentifierKey] = paginationIdentifierKey;
    }

    return responseHelper.successWithData(meta);
  }
}

module.exports = MetaFormatter;
