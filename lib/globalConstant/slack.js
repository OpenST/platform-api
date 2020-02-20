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

  addRedemptionInfoSection(data) {
    const oThis = this;

    let InfoHeaderLine = '*Hi, We have a new Redemption Request at Ost *';

    let message = '';
    message += `${InfoHeaderLine}\n`;
    message += `*Redemption Id:* ${data.redemptionId}\n`;
    message += `*User Id:* ${data.userId}\n`;
    message += `*Token:* ${data.tokenName}\n`;
    message += `*Token Holder Address:* ${data.tokenHolderAddressLink}\n`;
    message += `*Email:* ${data.email}\n`;
    message += `*Gift Card Details:* ${data.productName}\n`;
    message += `*Country:* ${data.country}\n`;
    message += `*Amount:* ${data.amount} ${data.currency}\n`;
    message += `*Token Transfer Transaction:* ${data.transactionViewLink}\n`;


    return oThis.addTextSection(message);
  }

  addTextSection(text) {
    let textSection = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: text
      }
    };

    return textSection;
  }

  get addDividerSection() {
    let divider = {
      type: 'divider'
    };
    return divider;
  }

  addRedemptionActionSection(redemptionId, clientId) {
    const oThis = this;

    let fulfillRedemptionValue = `${
        oThis.fulfillRedemptionEventType
        }|redemption_id:${redemptionId}|client_id:${clientId}`,
      cancelRedemptionValue = `${oThis.cancelRedemptionEventType}|redemption_id:${redemptionId}|client_id:${clientId}`;

    let elements = [
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

    let redemptionActionSection = {
      type: 'actions',
      elements: elements
    };

    return redemptionActionSection;
  }

  // slack domain related constants start

  get slackTeamDomain() {
    return 'ostdotcom';
  }

  get eventExpiryTimestamp() {
    if (basicHelper.isDevelopment()) {
      return 5 * 60 * 10000;
    }
    return 5 * 60;
  }

  // slack domain related constants end

  // slack event type start

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

  // slack event type end
}

module.exports = new Slack();
