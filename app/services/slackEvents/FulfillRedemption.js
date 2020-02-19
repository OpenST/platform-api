const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  SlackEventBase = require(rootPrefix + '/app/services/slackEvents/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  slackConstants = require(rootPrefix + '/lib/globalConstant/slack');

require(rootPrefix + '/lib/redemption/userRequests/Fulfill');

/**
 * Class to process approve user event.
 *
 * @class FulfillRedemption
 */
class FulfillRedemption extends SlackEventBase {
  /**
   * Async perform.
   *
   * @returns {Promise<result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis._callFulfillRedemptionService();

    await oThis._postResponseToSlack();

    return responseHelper.successWithData({});
  }

  /**
   * Call approve user service.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _callFulfillRedemptionService() {
    const oThis = this;

    const serviceParams = {
      userRedemptionId: [oThis.eventParams.redemption_id],
      currentAdmin: oThis.currentAdmin
    };

    const FulfillUserRedemptionRequestLib = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'FulfillUserRedemptionRequest');

    const fulfillUserRedemptionRsp = await new FulfillUserRedemptionRequestLib(serviceParams).perform();

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

InstanceComposer.registerAsShadowableClass(FulfillRedemption, coreConstants.icNameSpace, 'FulfillRedemption');

module.exports = {};
