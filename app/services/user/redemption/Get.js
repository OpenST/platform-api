const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserRedemptionBase = require(rootPrefix + '/app/services/user/redemption/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to fetch user redemption.
 *
 * @class GetUserRedemption
 */
class UserRedemptionGet extends UserRedemptionBase {
  /**
   * Constructor to fetch user redemption.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {string} params.user_id
   * @param {string} params.redemption_id
   *
   * @augments UserRedemptionBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userRedemptionUuid = params.redemption_id;
  }

  /**
   * Set redemption uuids.
   *
   * @sets oThis.redemptionUuids
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setRedemptionUuids() {
    const oThis = this;

    oThis.redemptionUuids = [oThis.userRedemptionUuid];
  }

  /**
   * Return service response.
   *
   * @returns {Promise<>}
   * @private
   */
  async _prepareResponse() {
    const oThis = this;

    const userRedemption = oThis.userRedemptions[0];

    if (!CommonValidators.validateObject(userRedemption)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_g_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_redemption_id'],
          debug_options: { userId: oThis.userId, tokenId: oThis.tokenId, userRedemptionUuid: oThis.userRedemptionUuid }
        })
      );
    }

    return responseHelper.successWithData({
      [resultType.userRedemption]: userRedemption
    });
  }
}

InstanceComposer.registerAsShadowableClass(UserRedemptionGet, coreConstants.icNameSpace, 'UserRedemptionGet');

module.exports = {};
