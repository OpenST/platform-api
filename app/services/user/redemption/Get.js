const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserRedemptionsByUuid');

/**
 * Class to fetch user redemption.
 *
 * @class GetUserRedemption
 */
class UserRedemptionGet extends ServiceBase {
  /**
   * Constructor to fetch user redemption.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {number} params.user_id
   * @param {number} params.user_redemption_uuid
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;

    oThis.userId = params.user_id;
    oThis.userRedemptionUuid = params.user_redemption_uuid;
    oThis.userRedemption = {};
  }

  /**
   * Async perform.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateTokenStatus();

    await oThis._fetchRedemption();

    await oThis._returnResponse();
  }

  /**
   * Fetch redemption.
   *
   * @sets oThis.userRedemption
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchRedemption() {
    const oThis = this;

    const RedemptionsByIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserRedemptionsByUuid');

    const response = await new RedemptionsByIdCache({
      uuids: [oThis.userRedemptionUuid]
    }).fetch();

    oThis.userRedemption = response.data.redemptions[oThis.userRedemptionUuid];
  }

  /**
   * Return recovery owner entity.
   *
   * @returns {Promise<>}
   * @private
   */
  async _returnResponse() {
    const oThis = this;

    return responseHelper.successWithData({
      [resultType.userRedemption]: oThis.userRedemption
    });
  }
}

InstanceComposer.registerAsShadowableClass(UserRedemptionGet, coreConstants.icNameSpace, 'UserRedemptionGet');

module.exports = {};
