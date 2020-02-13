const Slack = require('slack');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Declare variables.
const token = coreConstants.SA_SLACK_OAUTH_TOKEN;

/**
 * Class for slack wrapper.
 *
 * @class SlackWrapper
 */
class SlackWrapper {
  /**
   * Initialize slack object.
   *
   * @sets oThis.slackObj
   *
   * @returns {Promise<void>}
   * @private
   */
  async _initializeSlackObj() {
    const oThis = this;

    oThis.slackObj = new Slack({ token: token });
  }

  /**
   * Send message to slack channel.
   *
   * @param {object} postMessageParams
   *
   * @returns {Promise<any>}
   */
  async sendMessage(postMessageParams) {
    const oThis = this;

    if (!oThis.slackObj) {
      await oThis._initializeSlackObj();
    }

    const preApiTimestamp = Date.now();

    return new Promise(function(resolve, reject) {
      oThis.slackObj.chat
        .postMessage(postMessageParams)
        .then((response) => {
          logger.info('(' + (Date.now() - preApiTimestamp) + ' ms)', JSON.stringify(postMessageParams));

          return resolve(response);
        })
        .catch((err) => {
          logger.debug('Error in slack::send postMessage api: ', err);
          reject(err);
        });
    });
  }
}

module.exports = new SlackWrapper();
