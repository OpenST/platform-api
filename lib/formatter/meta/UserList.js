/**
 * Formatter for UserList meta entity to convert keys to snake case.
 *
 * @module lib/formatter/meta/UserList
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination'),
  BaseMeta = require(rootPrefix + '/lib/formatter/meta/Base');

/**
 * Class for UserList meta formatter.
 *
 * @class
 */
class MetaFormatter extends BaseMeta {
  /**
   * Constructor for UserList Meta Formatter.
   *
   * @param {Object} [params]
   * @param {String} [params.pagination_identifier]
   * @param {String} [params.ids]
   *
   * @constructor
   */
  constructor(params) {
    super(params);
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

    let userListMeta = oThis._constructMeta(oThis.params);

    userListMeta.next_page_payload.ids = oThis.params.ids;

    return responseHelper.successWithData(userListMeta);
  }
}

module.exports = MetaFormatter;
