/**
 * Module to get user redemption
 *
 * @module app/services/user/redemption/Base
 */

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Redemption base class
 *
 * @class RedemptionBase
 */
class RedemptionBase extends ServiceBase {
  /**
   *
   * @param {object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenShardDetails = null;
  }

  /**
   *
   * set token shard details
   *
   * @private
   */
  async _setTokenShardDetails() {
    const oThis = this;

    const TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
    const tokenShardNumbersCache = new TokenShardNumbersCache({
      tokenId: oThis.tokenId
    });

    const response = await tokenShardNumbersCache.fetch();
    if (response.isFailure()) {
      return Promise.reject(response);
    }
    oThis.tokenShardDetails = response.data;
  }

  /**
   * set user data for oThis.userId
   *
   * @private
   */
  async _setCurrentUserData() {
    const oThis = this;

    // Fetch company users details
    const TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId],
        shardNumber: oThis.tokenShardDetails[shardConstant.userEntityKind]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCacheObj.fetch();

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('Could not fetched token user details.');

      Promise.reject(tokenUserDetailsCacheRsp);
    }

    oThis.userData = tokenUserDetailsCacheRsp.data[oThis.userId];

    if (!CommonValidators.validateObject(oThis.userData)) {
      return oThis._validationError('a_s_u_r_b_1', ['invalid_user_id'], {
        userId: oThis.userId
      });
    }
  }
}

module.exports = RedemptionBase;
