const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let invertedStatuses;

/**
 * Class for redemption product constants.
 *
 * @class RedemptionProductsConstants
 */
class RedemptionProductsConstants {
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

    invertedStatuses = invertedStatuses = util.invert(oThis.statuses);

    return invertedStatuses;
  }
}

module.exports = new RedemptionProductsConstants();
