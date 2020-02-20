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
   * @param {string} params.tokenName
   * @param {string} params.clientId
   * @param {string} params.productName
   * @param {string} params.tokenHolderAddressLink
   * @param {string} params.transactionViewLink
   * @param {string} params.country
   * @param {string} params.currency
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.redemptionId = params.redemptionId;
    oThis.userId = params.userId;
    oThis.tokenName = params.tokenName;
    oThis.tokenHolderAddressLink = params.tokenHolderAddressLink;
    oThis.email = params.email;
    oThis.productName = params.productName;
    oThis.country = params.country;
    oThis.amount = params.amount;
    oThis.currency = params.currency;
    oThis.transactionViewLink = params.transactionViewLink;
    oThis.clientId = params.clientId;
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

    let data = {
      redemptionId: oThis.redemptionId,
      userId: oThis.userId,
      tokenName: oThis.tokenName,
      tokenHolderAddressLink: oThis.tokenHolderAddressLink,
      email: oThis.email,
      productName: oThis.productName,
      country: oThis.country,
      amount: oThis.amount,
      currency: oThis.currency,
      transactionViewLink: oThis.transactionViewLink,
      clientId: oThis.clientId
    };

    blocks.push(slackConstants.addRedemptionInfoSection(data));
    blocks.push(slackConstants.addDividerSection);

    blocks.push(slackConstants.addRedemptionActionSection(oThis.redemptionId, oThis.clientId));
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
