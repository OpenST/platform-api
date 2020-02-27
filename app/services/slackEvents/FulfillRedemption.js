const rootPrefix = '../../..',
  SlackEventBase = require(rootPrefix + '/app/services/slackEvents/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  FulfillRedemptionRequest = require(rootPrefix + '/lib/redemption/userRequests/Fulfill'),
  slackConstants = require(rootPrefix + '/lib/globalConstant/slack');

/**
 * Class to process approve user event.
 *
 * @class FulfillRedemption
 */
class FulfillRedemption extends SlackEventBase {
  /**
   * Call approve user service.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _callRedemptionService() {
    const oThis = this;

    const serviceParams = {
      userRedemptionId: oThis.eventParams.redemption_id,
      currentAdmin: oThis.currentAdmin,
      clientId: oThis.eventParams.client_id
    };

    const fulfillUserRedemptionRsp = await new FulfillRedemptionRequest(serviceParams).perform().catch(function(err) {
      return err;
    });

    if (fulfillUserRedemptionRsp.isFailure()) {
      oThis._setError(fulfillUserRedemptionRsp);
    }
  }

  /**
   * Update payload for slack post request.
   *
   * @param {number} actionPos
   * @param {array} newBlocks
   *
   * @returns {Promise<array>}
   * @private
   */
  async _updatedBlocks(actionPos, newBlocks) {
    const oThis = this;

    logger.log('_updateBlocks start');

    if (oThis.errMsg) {
      const formattedMsg = '`error:`' + oThis.errMsg;

      const trailingArray = newBlocks.splice(actionPos + 1);

      newBlocks[actionPos + 1] = slackConstants.addTextSection(formattedMsg);
      newBlocks = newBlocks.concat(trailingArray);
    } else {
      const txt = await oThis._textToWrite('Fulfilled');
      const newElement = {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: txt
          }
        ]
      };

      newBlocks[actionPos] = newElement;
    }

    return newBlocks;
  }
}

module.exports = FulfillRedemption;
