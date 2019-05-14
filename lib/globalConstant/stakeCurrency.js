/**
 * Module to define constants for stake currencies.
 *
 * @module lib/globalConstant/stakeCurrency
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let invertedStatuses;

class StakeCurrency {
  get OST() {
    return 'OST';
  }

  get USDC() {
    return 'USDC';
  }

  get setupInProgressStatus() {
    return 'setupInProgress';
  }

  get activeStatus() {
    return 'active';
  }

  get inActiveStatus() {
    return 'inActive';
  }

  get statuses() {
    const oThis = this;

    return {
      '1': oThis.setupInProgressStatus,
      '2': oThis.activeStatus,
      '3': oThis.inActiveStatus
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

module.exports = new StakeCurrency();
