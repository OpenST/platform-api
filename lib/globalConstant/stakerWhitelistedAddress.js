'use strict';

/**
 *
 * @module lib/globalConstant/stakerWhitelistedAddress
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let invertedStatuses;

class StakerWhitelistedAddress {
  constructor() {}

  get activeStatus() {
    return 'active';
  }

  get inActiveStatus() {
    return 'inActive';
  }

  get statuses() {
    const oThis = this;
    return {
      '1': oThis.activeStatus,
      '2': oThis.inActiveStatus
    };
  }

  get invertedStatuses() {
    const oThis = this;
    if (invertedStatuses) {
      return invertedStatuses;
    }
    invertedStatuses = util.invert(oThis.statuses);
    return invertedStatuses;
  }
}

module.exports = new StakerWhitelistedAddress();
