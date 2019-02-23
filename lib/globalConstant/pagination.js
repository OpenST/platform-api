'use strict';
/**
 * Global constants for pagination
 *
 * @module lib/globalConstant/pagination
 */

/**
 *
 * @class
 */
class Pagination {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor() {}

  get paginationIdentifierKey() {
    return 'pagination_identifier';
  }

  get nextPagePayloadKey() {
    return 'next_page_payload';
  }

  get minDeviceListPageSize() {
    return 1;
  }

  get defaultDeviceListPageSize() {
    return 10;
  }

  get maxDeviceListPageSize() {
    return 25;
  }

  get minUserListPageSize() {
    return 1;
  }

  get defaultUserListPageSize() {
    return 10;
  }

  get maxUserListPageSize() {
    return 25;
  }

  get minSessionPageSize() {
    return 1;
  }

  get defaultSessionPageSize() {
    return 10;
  }

  get maxSessionPageSize() {
    return 25;
  }
}

module.exports = new Pagination();
