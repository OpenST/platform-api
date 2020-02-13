/**
 * Module for token redemption product constants.
 *
 * @module lib/globalConstant/tokenRedemptionProducts
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let statuses, invertedStatuses;

/**
 * Class for token redemption product constants.
 *
 * @class TokenRedemptionProductsConstants
 */
class TokenRedemptionProductsConstants {
  get activeStatus() {
    return 'active';
  }

  get inActiveStatus() {
    return 'inActive';
  }

  get statuses() {
    const oThis = this;

    if (statuses) {
      return statuses;
    }

    statuses = {
      '1': oThis.activeStatus,
      '2': oThis.inActiveStatus
    };

    return statuses;
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

module.exports = new TokenRedemptionProductsConstants();
