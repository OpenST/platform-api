const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo');

/**
 * Class for slack constants.
 *
 * @class Slack
 */
class Slack {
  // Channel names start.
  get redemptionRequestChannelName() {
    let subEnvText = '';

    if (coreConstants.subEnvironment !== environmentInfoConstants.subEnvironment.main) {
      subEnvText = '_' + coreConstants.subEnvironment;
    }

    if (basicHelper.isProduction()) {
      return 'ost_redemption' + subEnvText;
    }

    return 'test_ost_redemption' + subEnvText;
  }
  // Channel names end.

  /**
   * Add redemption info section.
   *
   * @param {object} data
   * @param {string} data.userId
   * @param {string} data.email
   * @param {string} data.productName
   * @param {string} data.country
   * @param {string} data.amount
   * @param {string} data.currency
   * @param {string} data.redemptionId
   * @param {string} data.tokenName
   * @param {string} data.tokenHolderAddressLink
   * @param {string} data.transactionViewLink
   *
   * @returns {{text: {text: *, type: string}, type: string}}
   */
  addRedemptionInfoSection(data) {
    const oThis = this;

    const infoHeaderLine = '*Hi, We have a new Redemption Request at Ost *';

    let message = '';
    message += `${infoHeaderLine}\n`;
    message += `*Token name:* ${data.tokenName}\n`;
    message += `*User Id:* ${data.userId}\n`;
    message += `*Email address:* ${data.email}\n`;
    message += `*Gift Card type:* ${data.productName}\n`;
    message += `*Country:* ${data.country}\n`;
    message += `*Amount:* ${data.amount} ${data.currency}\n`;
    message += `*Redemption Id:* ${data.redemptionId}\n`;
    message += `*Token Holder Address:* ${data.tokenHolderAddressLink}\n`;
    message += `*Token Transfer Transaction:* ${data.transactionViewLink}\n`;

    return oThis.addTextSection(message);
  }

  /**
   * Add text section.
   *
   * @param {string} text
   *
   *  @returns {{text: {text: *, type: string}, type: string}}
   */
  addTextSection(text) {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: text
      }
    };
  }

  /**
   * Add divider section.
   *
   * @returns {{type: string}}
   */
  get addDividerSection() {
    return {
      type: 'divider'
    };
  }

  addRedemptionActionSection(redemptionId, clientId) {
    const oThis = this;

    const fulfillRedemptionValue = `${
        oThis.fulfillRedemptionEventType
      }|redemption_id:${redemptionId}|client_id:${clientId}`,
      cancelRedemptionValue = `${oThis.cancelRedemptionEventType}|redemption_id:${redemptionId}|client_id:${clientId}`;

    const elements = [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Fulfill Redemption',
          emoji: true
        },
        style: 'primary',
        value: fulfillRedemptionValue,
        confirm: {
          title: {
            type: 'plain_text',
            text: 'Are you sure?'
          },
          text: {
            type: 'mrkdwn',
            text: 'Please confirm your action'
          },
          confirm: {
            type: 'plain_text',
            text: 'Fulfill Redemption'
          },
          deny: {
            type: 'plain_text',
            text: 'No'
          }
        }
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Cancel Redemption',
          emoji: true
        },
        style: 'danger',
        value: cancelRedemptionValue,
        confirm: {
          title: {
            type: 'plain_text',
            text: 'Are you sure?'
          },
          text: {
            type: 'mrkdwn',
            text: 'Please confirm your action'
          },
          confirm: {
            type: 'plain_text',
            text: 'Mark Cancelled'
          },
          deny: {
            type: 'plain_text',
            text: 'No'
          }
        }
      }
    ];

    return {
      type: 'actions',
      elements: elements
    };
  }

  // Slack domain related constants start.
  get slackTeamDomain() {
    return 'ostdotcom';
  }

  get eventExpiryTimestamp() {
    if (basicHelper.isDevelopment()) {
      return 5 * 60 * 10000;
    }

    return 5 * 60;
  }
  // Slack domain related constants end.

  // Slack event type start.
  get cancelRedemptionEventType() {
    return 'cancel_redemption';
  }

  get fulfillRedemptionEventType() {
    return 'fulfill_redemption';
  }

  get allowedEventTypes() {
    const oThis = this;

    return [oThis.cancelRedemptionEventType, oThis.fulfillRedemptionEventType];
  }
  // Slack event type end.
}

module.exports = new Slack();
