/**
 * This module helps in fullfiling user redemption requests
 */
const rootPrefix = '../../..',
  UserRedemptionActionBase = require(rootPrefix + '/lib/redemption/userRequests/Base'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class to take action on user redemption requests.
 *
 * @class FulfillUserRedemptionRequest
 */
class FulfillUserRedemptionRequest extends UserRedemptionActionBase {
  /**
   * Constructor to take action on user redemption requests.
   *
   * @param params
   */
  constructor(params) {
    super(params);
  }

  /**
   * Get redemption status to be updated.
   *
   * @private
   */
  _getRedemptionStatus() {
    return userRedemptionConstants.invertedStatuses[userRedemptionConstants.redemptionFulfilledStatus];
  }

  /**
   * Get Webhook topic to be sent.
   *
   * @private
   */
  _getRedemptionWebhookTopicToSend() {
    return webhookSubscriptionsConstants.redemptionFulfilledTopic;
  }
}

module.exports = FulfillUserRedemptionRequest;
