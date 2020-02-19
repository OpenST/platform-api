const rootPrefix = '../../..',
  HttpLibrary = require(rootPrefix + '/lib/providers/HttpRequest'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.internal);

/**
 * Class for slack related webhooks events base.
 *
 * @class SlackEventBase
 */
class SlackEventBase extends ServiceBase {
  /**
   * Constructor for slack related webhooks events base.
   *
   * @param {object} params
   * @param {object} params.eventDataPayload: event payload from slack
   * @param {string} params.eventDataPayload.response_url
   * @param {object} params.eventDataPayload.message
   * @param {array<object>} params.eventDataPayload.actions
   * @param {object} params.eventParams: event params
   * @param {object} params.currentAdmin: current admin params
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.eventDataPayload = params.eventDataPayload;
    oThis.eventParams = params.eventParams;
    oThis.currentAdmin = params.currentAdmin;

    oThis.errMsg = null;
  }

  /**
   * Validate parameters.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    logger.log('Validate for slack events factory.');

    if (!oThis.eventParams || !CommonValidators.validateObject(oThis.eventParams)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_se_b_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
  }

  /**
   * Post request to slack.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _postResponseToSlack() {
    const oThis = this;

    logger.log('_postRequestToSlack start');

    const header = { 'Content-Type': 'application/json' };

    const httpLibObj = new HttpLibrary({
      resource: oThis.eventDataPayload.response_url,
      header: header,
      noFormattingRequired: true
    });

    const requestPayload = await oThis._getPayloadForSlackPost();
    const resp = await httpLibObj.post(JSON.stringify(requestPayload));

    if (resp.isFailure()) {
      return Promise.reject(resp);
    }
  }

  /**
   * Get payload for slack post request.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getPayloadForSlackPost() {
    const oThis = this;

    logger.log('_getPayloadForSlackPost start');

    const blocks = await oThis._newBlockForSlack();
    const text = oThis.errMsg ? 'Unable to Process' : 'Your request was processed.';

    return { text: text, blocks: blocks };
  }

  /**
   * Construct payload for slack post request.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _newBlockForSlack() {
    const oThis = this;

    logger.log('_newBlockForSlack start');

    let actionPos = 0;

    const currentBlocks = oThis.eventDataPayload.message.blocks,
      actionBlockId = oThis.eventDataPayload.actions[0].block_id;

    for (let index = 0; index < currentBlocks.length; index++) {
      if (currentBlocks[index].block_id == actionBlockId) {
        actionPos = index;
      }
    }

    const newBlocks = JSON.parse(JSON.stringify(currentBlocks));

    return oThis._updatedBlocks(actionPos, newBlocks);
  }

  async _textToWrite(actionStr) {
    const oThis = this;

    const currentTimeStr = new Date().toUTCString();
    /*
    Note: Not using date and atmention because of sanitizer error in webhook payload.
    const currentTime = Math.round(new Date() / 1000);
    return `>*${actionStr} by <@${
      oThis.eventDataPayload.user.id
      }>* <!date^${currentTime}^{date_pretty} at {time}|${currentTimeStr}}>`;
     */

    return `\n>*${actionStr} by ${oThis.eventDataPayload.user.name}* at ${currentTimeStr}`;
  }

  /**
   * Set error message received from service.
   *
   * @sets oThis.errMsg
   *
   * @returns {Promise<void>}
   * @private
   */
  _setError(serviceResponse) {
    const oThis = this;

    logger.error('_setError start');

    const errorResponse = serviceResponse.toHash(errorConfig);

    const errors = errorResponse.err.error_data;

    if (errors.length === 0) {
      oThis.errMsg = errorResponse.err.msg;
    } else {
      oThis.errMsg = '';
      for (let index = 0; index < errors.length; index++) {
        oThis.errMsg += errors[index].msg;
      }
    }
  }

  /**
   * Update payload for slack post request.
   *
   * @returns {Promise<array>}
   * @private
   */
  async _updatedBlocks() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = SlackEventBase;
