'use strict';
/**
 * Redemption product model db constants.
 *
 * @module lib/globalConstant/redemptionProduct
 */

let invertedStatuses;

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

class RedemptionProduct {
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

module.exports = new RedemptionProduct();
