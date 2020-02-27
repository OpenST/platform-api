const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination');

/**
 * Class for meta formatter.
 *
 * @class BaseMetaFormatter
 */
class BaseMetaFormatter {
  /**
   * Constructor for meta.
   *
   * @param {object} params
   * @param {object} params.meta
   * @param {object} [params.meta.next_page_payload]
   * @param {string} [params.meta.next_page_payload.pagination_identifier]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
    oThis.meta = params.meta;

    oThis.paginationIdentifierPresent = null;
  }

  /**
   * Main performer for class.
   *
   * @returns {{}}
   */
  perform() {
    const oThis = this;

    const meta = oThis._constructMeta();

    return responseHelper.successWithData(meta);
  }

  /**
   * Construct meta object.
   *
   * @returns {*}
   * @private
   */
  _constructMeta() {
    const oThis = this;

    let meta = {
      [paginationConstants.nextPagePayloadKey]: {}
    };

    if (oThis._isPaginationIdentifierPresent()) {
      const paginationIdentifier =
        oThis.meta[paginationConstants.nextPagePayloadKey][paginationConstants.paginationIdentifierKey];
      meta[paginationConstants.nextPagePayloadKey][
        paginationConstants.paginationIdentifierKey
      ] = basicHelper.encryptPageIdentifier(paginationIdentifier);
    }

    meta = oThis._appendSpecificMetaData(meta);

    return meta;
  }

  /**
   * Check if pagination identifier present or not.
   *
   * @sets oThis.paginationIdentifierPresent
   *
   * @private
   */
  _isPaginationIdentifierPresent() {
    const oThis = this;

    if (oThis.paginationIdentifierPresent == null) {
      const nextPagePayload = oThis.meta[paginationConstants.nextPagePayloadKey] || {};
      oThis.paginationIdentifierPresent = nextPagePayload[paginationConstants.paginationIdentifierKey] ? true : false;
    }

    return oThis.paginationIdentifierPresent;
  }

  /**
   * Append service specific keys in meta.
   *
   * @private
   */
  _appendSpecificMetaData() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = BaseMetaFormatter;
