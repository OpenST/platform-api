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
    return 10;
  }

  get maxDeviceListPageSize() {
    return 25;
  }
}

module.exports = new Pagination();
