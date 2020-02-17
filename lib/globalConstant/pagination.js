/**
 * Module for pagination related global constants.
 *
 * @module lib/globalConstant/pagination
 */

/**
 * Class for pagination related global constants.
 *
 * @class Pagination
 */
class Pagination {
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

  get minRedemptionListPageSize() {
    return 1;
  }

  get defaultRedemptionListPageSize() {
    return 10;
  }

  get maxRedemptionListPageSize() {
    return 25;
  }

  get minRedemptionProductListPageSize() {
    return 1;
  }

  get defaultRedemptionProductListPageSize() {
    return 10;
  }

  get maxRedemptionProductListPageSize() {
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

  get defaultWebhookListPageSize() {
    return 25;
  }

  get maxWebhookListPageSize() {
    return 25;
  }

  get minWebhookListPageSize() {
    return 1;
  }
}

module.exports = new Pagination();
