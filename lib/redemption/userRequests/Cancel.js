/**
 * This module helps in cancelling user redemption requests
 */
const rootPrefix = '../../..',
  UserRedemptionActionBase = require(rootPrefix + '/lib/redemption/userRequests/Base'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class to take action on user redemption requests.
 *
 * @class CancelUserRedemptionRequest
 */
class CancelUserRedemptionRequest extends UserRedemptionActionBase {
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
    return userRedemptionConstants.invertedStatuses[userRedemptionConstants.redemptionCancelledStatus];
  }

  /**
   * Get Webhook topic to be sent.
   *
   * @private
   */
  _getRedemptionWebhookTopicToSend() {
    return webhookSubscriptionsConstants.redemptionCancelledTopic;
  }
}

module.exports = CancelUserRedemptionRequest;
