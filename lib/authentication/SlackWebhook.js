const crypto = require('crypto');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  AdminModel = require(rootPrefix + '/app/models/mysql/Admin'),
  AdminByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Admin'),
  AdminBySlackIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/AdminBySlackId'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  slackConstants = require(rootPrefix + '/lib/globalConstant/slack'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs');

/**
 * Class to validate webhooks received from Slack.
 *
 * @class AuthSlackWebhook
 */
class AuthSlackWebhook {
  /**
   * Constructor to validate webhooks received from Slack.
   *
   * @param {object} params
   * @param {string} params.rawBody
   * @param {object} params.requestHeaders
   * @param {object} params.webhookParams
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.rawBody = params.rawBody;
    oThis.requestHeaders = params.requestHeaders;
    oThis.webhookParams = params.webhookParams;

    oThis.webhookPayload = oThis.webhookParams.payload;

    oThis.currentAdmin = null;
  }

  /**
   * Perform.
   *
   * @return {Promise<*|result>}
   */
  async perform() {
    const oThis = this;

    await oThis._validateRawBodyParams();

    await oThis._validateWebhookParams();

    await oThis._fetchAndValidateAdmin();

    await oThis._valiadateRequestHeaders();

    return responseHelper.successWithData({ current_admin: oThis.currentAdmin });
  }

  /**
   * Validate raw body params.
   *
   * @return {Promise<*>}
   * @private
   */
  async _validateRawBodyParams() {
    const oThis = this;

    if (!CommonValidator.validateString(oThis.rawBody)) {
      return oThis._unauthorizedResponse('l_a_sw_vrbp_1');
    }
  }

  /**
   * Validate webhook params.
   *
   * @return {Promise<*>}
   * @private
   */
  async _validateWebhookParams() {
    const oThis = this;

    if (!CommonValidator.validateObject(oThis.webhookPayload)) {
      return oThis._unauthorizedResponse('l_a_sw_vwp_1');
    }

    const domain = oThis.webhookPayload.team.domain,
      apiAppId = oThis.webhookPayload.api_app_id,
      isValidApiAppId = coreConstants.SA_SLACK_API_APP_ID === apiAppId,
      isValidSlackDomain = domain === slackConstants.slackTeamDomain;

    if (!isValidApiAppId || !isValidSlackDomain) {
      return oThis._unauthorizedResponse('l_a_sw_vwp_3');
    }
  }

  /**
   * Fetch and validate admin
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchAndValidateAdmin() {
    const oThis = this,
      adminSlackId = oThis.webhookPayload.user.id;

    logger.log('Fetching admin.', adminSlackId);

    const adminBySlackIdCacheRsp = await new AdminBySlackIdCache({ slackId: adminSlackId }).fetch();

    if (
      adminBySlackIdCacheRsp.isFailure() ||
      !CommonValidator.validateObject(adminBySlackIdCacheRsp.data) ||
      !adminBySlackIdCacheRsp.data.id
    ) {
      return oThis._unauthorizedResponse('l_a_sw_fava_1');
    }

    const adminId = adminBySlackIdCacheRsp.data.id;

    const cacheResponse = await new AdminByIdCache({ id: adminId }).fetch();
    if (cacheResponse.isFailure() || !CommonValidator.validateObject(cacheResponse.data)) {
      return oThis._unauthorizedResponse('l_a_sw_fava_2');
    }

    oThis.currentAdmin = cacheResponse.data[adminId];
  }

  /**
   * Validate request headers.
   *
   * @return {Promise<void>}
   * @private
   */
  async _valiadateRequestHeaders() {
    const oThis = this;

    if (!CommonValidator.validateObject(oThis.requestHeaders)) {
      return oThis._unauthorizedResponse('l_a_sw_vrh_1');
    }

    const requestTimestamp = oThis.requestHeaders['x-slack-request-timestamp'],
      currentTimestamp = Math.floor(Date.now() / 1000),
      requestHeaderSignature = oThis.requestHeaders['x-slack-signature'],
      splittedRequestHeaderSignature = requestHeaderSignature.split('='),
      version = splittedRequestHeaderSignature[0],
      signature = splittedRequestHeaderSignature[1];

    if (version !== 'v0') {
      return oThis._unauthorizedResponse('l_a_sw_vrh_2');
    }

    if (
      !CommonValidator.validateTimestamp(requestTimestamp) ||
      requestTimestamp > currentTimestamp ||
      requestTimestamp < currentTimestamp - slackConstants.eventExpiryTimestamp
    ) {
      return oThis._unauthorizedResponse('l_a_sw_vrh_3');
    }

    if (!CommonValidator.validateString(signature)) {
      return oThis._unauthorizedResponse('l_a_sw_vrh_4');
    }

    return oThis._validateSignature(requestTimestamp, version, signature);
  }

  /**
   * Validate signature.
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateSignature(requestTimestamp, version, signature) {
    const oThis = this;

    const signatureString = `${version}:${requestTimestamp}:${oThis.rawBody}`;
    const generatedSignature = crypto
      .createHmac('sha256', coreConstants.SA_SLACK_SIGNING_SECRET)
      .update(signatureString)
      .digest('hex');

    if (generatedSignature !== signature) {
      return oThis._unauthorizedResponse('l_a_sw_vs_1');
    }
  }

  /**
   * Unauthorized response.
   *
   * @param {string} code
   *
   * @returns {Promise<never>}
   * @private
   */
  async _unauthorizedResponse(code) {
    const errorObj = responseHelper.error({
      internal_error_identifier: code,
      api_error_identifier: 'unauthorized_api_request'
    });

    await createErrorLogsEntry.perform(errorObj, errorLogsConstants.mediumSeverity);

    return Promise.reject(errorObj);
  }
}

module.exports = AuthSlackWebhook;
