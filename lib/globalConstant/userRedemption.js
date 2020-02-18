/**
 * Token User Redemption
 *
 * @module lib/globalConstant/userRedemption
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let statuses, invertedStatuses;

/**
 * Class for UserRedemption constants.
 *
 * @class UserRedemptionConstants
 */
class UserRedemptionConstants {
  get redemptionProcessingStatus() {
    return 'PROCESSING';
  }

  get redemptionAcceptedStatus() {
    return 'ACCEPTED';
  }

  get redemptionFailedStatus() {
    return 'FAILED';
  }

  get redemptionCancelledStatus() {
    return 'CANCELLED';
  }

  get redemptionFulfilledStatus() {
    return 'FULFILLED';
  }

  get invertedStatuses() {
    const oThis = this;

    if (invertedStatuses) {
      return invertedStatuses;
    }

    invertedStatuses = util.invert(oThis.statuses);

    return invertedStatuses;
  }

  get statuses() {
    const oThis = this;

    if (statuses) {
      return statuses;
    }

    statuses = {
      1: oThis.redemptionProcessingStatus,
      2: oThis.redemptionAcceptedStatus,
      3: oThis.redemptionFailedStatus,
      4: oThis.redemptionCancelledStatus,
      5: oThis.redemptionFulfilledStatus
    };

    return statuses;
  }
}

module.exports = new UserRedemptionConstants();
