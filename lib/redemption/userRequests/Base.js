/**
 * This module helps in taking action on user redemption requests
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  ConfigCrudByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserRedemptionsByUuid');

/**
 * Class to take action on user redemption requests.
 *
 * @class UserRedemptionActionBase
 */
class UserRedemptionActionBase {
  /**
   * Constructor to take action on user redemption requests.
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.userRedemptionId = params.userRedemptionId;
    oThis.currentAdmin = params.currentAdmin;
    oThis.clientId = params.clientId;

    oThis.userRedemptionObj = {};
  }

  /**
   * Main Performer
   *
   * @returns {Promise<*|result>}
   */
  async perform() {
    const oThis = this;

    await oThis._init();

    await oThis._fetchRedemptionDetails();

    await oThis._updateUserRedemption();

    await oThis._sendWebhooks();

    return responseHelper.successWithData({});
  }

  /**
   * Init
   *
   * @returns {Promise<void>}
   * @private
   */
  async _init() {
    const oThis = this;

    // Fetch client strategy
    let configStrategyRsp = await new ConfigCrudByClientId(oThis.clientId).get();
    oThis.ic = new InstanceComposer(configStrategyRsp.data);
  }

  /**
   * Fetch redemption details.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchRedemptionDetails() {
    const oThis = this;

    const UserRedemptionsByUuidCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid');

    const userRedemptionCacheResp = await new UserRedemptionsByUuidCache({ uuids: [oThis.userRedemptionId] }).fetch();

    if (userRedemptionCacheResp.isFailure()) {
      return Promise.reject(userRedemptionCacheResp);
    }

    oThis.userRedemptionObj = userRedemptionCacheResp.data[oThis.userRedemptionId];

    if (!CommonValidators.validateObject(oThis.userRedemptionObj)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_r_ur_f_1',
          api_error_identifier: 'something_went_wrong',
          params_error_identifiers: ['invalid_redemption_id'],
          debug_options: { userRedemptionId: oThis.userRedemptionId }
        })
      );
    }

    if (oThis.userRedemptionObj.status !== userRedemptionConstants.redemptionAcceptedStatus) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_r_ur_f_2',
          api_error_identifier: 'something_went_wrong',
          params_error_identifiers: ['invalid_redemption_id'],
          debug_options: { userRedemptionId: oThis.userRedemptionId }
        })
      );
    }
  }

  /**
   * Get redemption status to be updated.
   *
   * @private
   */
  _getRedemptionStatus() {
    throw 'Sub-class to implement';
  }

  /**
   * Get Webhook topic to be sent.
   *
   * @private
   */
  _getRedemptionWebhookTopicToSend() {
    throw 'Sub-class to implement';
  }

  /**
   * Update user redemption status.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateUserRedemption() {
    const oThis = this;

    await new UserRedemptionModel()
      .update({
        status: oThis._getRedemptionStatus()
      })
      .where({
        id: oThis.userRedemptionObj.id
      })
      .fire();

    const UserRedemptionsByUuidCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid'),
      promiseArray = [];

    promiseArray.push(new UserRedemptionsByUuidCache({ uuids: [oThis.userRedemptionId] }).clear());

    await Promise.all(promiseArray);
  }

  /**
   * Send Webhooks
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendWebhooks() {
    const oThis = this;

    const payload = {
      userId: oThis.userRedemptionObj.userUuid,
      webhookKind: oThis._getRedemptionWebhookTopicToSend(),
      clientId: oThis.clientId,
      userRedemptionUuid: oThis.userRedemptionId
    };

    await publishToPreProcessor.perform(oThis.ic.configStrategy.auxGeth.chainId, payload);
  }
}

module.exports = UserRedemptionActionBase;
