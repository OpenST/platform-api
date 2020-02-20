/**
 * This module helps in Validating user transaction redemption request
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/RedemptionIdsByUserId');

/**
 * Class to validate user transaction redemption request.
 *
 * @class FulfillUserRedemptionRequest
 */
class FulfillUserRedemptionRequest {
  /**
   * Constructor to validate user transaction redemption request.
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

    await oThis._fetchRedemptionDetails();

    await oThis._updateUserRedemption();

    await oThis._sendWebhooks();

    return responseHelper.successWithData({});
  }

  /**
   * Fetch redemption details.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchRedemptionDetails() {
    const oThis = this;

    const UserRedemptionsByUuidCache = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid');

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
   * Update user redemption status.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateUserRedemption() {
    const oThis = this;

    await new UserRedemptionModel()
      .update({
        status: userRedemptionConstants.invertedStatuses[userRedemptionConstants.redemptionFulfilledStatus]
      })
      .where({
        id: oThis.userRedemptionObj.id
      })
      .fire();

    const RedemptionsByUserIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RedemptionIdsByUserId'),
      UserRedemptionsByUuidCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid'),
      promiseArray = [];

    promiseArray.push(new RedemptionsByUserIdCache({ userId: oThis.userRedemptionObj.userUuid }).clear());
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
      webhookKind: webhookSubscriptionsConstants.redemptionFulfilledTopic,
      clientId: oThis.clientId,
      userRedemptionUuid: oThis.userRedemptionId
    };

    await publishToPreProcessor.perform(oThis.ic().configStrategy.auxGeth.chainId, payload);
  }
}

InstanceComposer.registerAsShadowableClass(
  FulfillUserRedemptionRequest,
  coreConstants.icNameSpace,
  'FulfillUserRedemptionRequest'
);

module.exports = {};
