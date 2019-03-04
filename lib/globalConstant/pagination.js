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

  get totalNoKey() {
    return 'total_no';
  }

  get hasNextPage() {
    return 'has_next_page';
  }

  get getEsTotalRecordKey() {
    return 'total_records';
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

  get minTransactionPageSize() {
    return 1;
  }

  get defaultTransactionPageSize() {
    return 10;
  }

  get maxTransactionPageSize() {
    return 25;
  }
}

module.exports = new Pagination();
