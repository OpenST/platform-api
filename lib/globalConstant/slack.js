const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic');

/**
 * Class for slack constants.
 *
 * @class Slack
 */
class Slack {
  // Channel names start.
  get redemptionRequestChannelName() {
    if (basicHelper.isProduction()) {
      return 'ost_redemption';
    }

    return 'test_ost_redemption';
  }

  // Channel names end.

  addRedemptionInfoSection(data) {
    const oThis = this;

    let InfoHeaderLine = '*Hi, We have a new Redemption Request at Ost *';

    let message = '';
    message += `${InfoHeaderLine}\n`;
    message += `*RedemptionId:* ${data.redemptionId}\n`;
    message += `*TokenName:* ${data.tokenName}\n`;
    message += `*User Id:* ${data.userId}\n`;
    message += `*Amount:* ${data.amount}\n`;
    message += `*Email address:* ${data.email}\n`;
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

  addRedemptionActionSection(redemptionId) {
    const oThis = this;

    let fulfilRedemptionValue = `${oThis.fulfilRedemptionEventType}|redemption_id:${redemptionId}`,
      cancelRedemptionValue = `${oThis.cancelRedemptionEventType}|redemption_id:${redemptionId}`;

    let elements = [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Fulfil Redemption',
          emoji: true
        },
        style: 'primary',
        value: fulfilRedemptionValue,
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
            text: 'Fulfil Redemption'
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

  get fulfilRedemptionEventType() {
    return 'fulfil_redemption';
  }

  get allowedEventTypes() {
    const oThis = this;
    return [oThis.cancelRedemptionEventType, oThis.fulfilRedemptionEventType];
  }

  // slack event type end
}

module.exports = new Slack();
