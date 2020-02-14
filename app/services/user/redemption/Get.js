/**
 * Module to get user redemption
 *
 * @module app/services/user/redemption/Get
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  RedemptionBase = require(rootPrefix + '/app/services/user/redemption/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/RedemptionsById');

/**
 * Class to fetch user redemption
 *
 * @class GetUserRedemption
 */
class GetUserRedemption extends RedemptionBase {
  /**
   * Constructor to fetch user redemption list
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {number} params.user_id
   * @param {number} params.redemption_id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;

    oThis.userId = params.user_id;
    oThis.redemptionUuid = params.redemption_id;
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

    await oThis._setTokenShardDetails();

    await oThis._setCurrentUserData();

    await oThis._fetchRedemption();

    await oThis._returnResponse();
  }

  /**
   * Fetch redemption
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchRedemption() {
    const oThis = this;

    const RedemptionsByIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RedemptionsById');

    const response = await new RedemptionsByIdCache({
      uuids: [oThis.redemptionUuid]
    }).fetch();

    oThis.userRedemption = response.data.redemptions[0];
  }

  /**
   * Return recovery owner entity.
   *
   * @returns {Promise<>}
   * @private
   */
  async _returnResponse() {
    const oThis = this;

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.userRedemption]: oThis.userRedemption
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(GetUserRedemption, coreConstants.icNameSpace, 'UserRedemptionGet');

module.exports = {};
