const rootPrefix = '..',
  slackWrapper = require(rootPrefix + '/lib/slack/wrapper'),
  slackConstants = require(rootPrefix + '/lib/globalConstant/slack');

/**
 * Class for posting new redemption request on slack.
 *
 * @class SlackNewRedemptionMessage
 */
class SlackNewRedemptionMessage {
  /**
   * Constructor for after redemption job.
   *
   * @param {object} params
   * @param {string} params.email
   * @param {string} params.redemptionId
   * @param {integer} params.userId
   * @param {decimal} params.amount
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.email = params.email;
    oThis.redemptionId = params.redemptionId;
    oThis.userId = params.userId;
    oThis.amount = params.amount;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._sendSlackMessage();
  }

  /**
   * Generate message.
   *
   * @returns {string}
   * @private
   */
  _generateMessage() {
    const oThis = this;

    const blocks = [],
      separator = '*===================================*';
    //todo: edit message data as needed
    let data = {
      email: oThis.email,
      tokenName: 'TEST Token',
      userId: oThis.userId,
      amount: oThis.amount,
      redemptionId: oThis.redemptionId
    };

    blocks.push(slackConstants.addRedemptionInfoSection(data));
    blocks.push(slackConstants.addDividerSection);

    blocks.push(slackConstants.addRedemptionActionSection(oThis.redemptionId));
    blocks.push(slackConstants.addTextSection(separator));

    return blocks;
  }

  /**
   * Send slack message.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendSlackMessage() {
    const oThis = this;

    const slackMessageParams = {
      channel: slackConstants.redemptionRequestChannelName,
      text: '*Hi, We have a new Redemption Request at Ost: *',
      blocks: oThis._generateMessage()
    };

    console.log('HERE========', JSON.stringify(slackMessageParams));

    return slackWrapper.sendMessage(slackMessageParams);
  }
}

module.exports = SlackNewRedemptionMessage;
