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

  get defaultDeviceListPageSize() {
    return 100;
  }

  get maxDeviceListPageSize() {
    return 100;
  }

  get defaultUserListPageSize() {
    return 10;
  }

  get maxUserListPageSize() {
    return 25;
  }

  get paginationIdentifierKey() {
    return 'pagination_identifier';
  }
}

module.exports = new Pagination();
