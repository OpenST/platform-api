const rootPrefix = '../../..',
  SlackEventBase = require(rootPrefix + '/app/services/slackEvents/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CancelRedemptionRequest = require(rootPrefix + '/lib/redemption/userRequests/Cancel'),
  slackConstants = require(rootPrefix + '/lib/globalConstant/slack');

/**
 * Class to process approve user event.
 *
 * @class CancelRedemption
 */
class CancelRedemption extends SlackEventBase {
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

    const cancelUserRedemptionRsp = await new CancelRedemptionRequest(serviceParams).perform().catch(function(err) {
      return err;
    });

    if (cancelUserRedemptionRsp.isFailure()) {
      oThis._setError(cancelUserRedemptionRsp);
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
      const txt = await oThis._textToWrite('Cancelled');
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

module.exports = CancelRedemption;
