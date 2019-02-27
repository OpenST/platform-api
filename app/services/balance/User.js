'use strict';
/**
 *  Fetch balance by userId.
 *
 * @module app/services/balance/User
 */

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  apiSignatureConstants = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/Balance');

/**
 * Class to get balance by userId.
 *
 * @class GetUserBalance
 */
class GetUserBalance extends ServiceBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {Integer} params.user_id - user id user who signed request
   * @param {Integer} [params.token_id]
   * @param {String} [params.api_signature_kind]
   * @param {Object} [params.user_data] - user data of user who signed request
   * @param {Object} [params.token_shard_details] - map of all shard numbers by token id
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.apiSignatureKind = params.api_signature_kind;

    oThis.tokenId = params.token_id;
    oThis.tokenShardDetails = params.token_shard_details;
    oThis.userData = params.user_data;

    oThis.tokenAddresses = null;
    oThis.configStrategyObj = null;
    oThis.balanceDetails = null;
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _asyncPerform() {
    const oThis = this;

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    if (!oThis.tokenShardDetails) {
      await oThis._fetchTokenShardNumbers();
    }

    if (!oThis.userData) {
      await oThis._fetchUserDetails();
    }

    await oThis._validateAccess();

    await oThis._fetchTokenAddresses();

    await oThis._fetchBalanceFromCache();

    return oThis._formatApiResponse();
  }

  /**
   * Fetch shard numbers for all entities which are sharded by token id
   *
   * @private
   */
  async _fetchTokenShardNumbers() {
    const oThis = this;

    let TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
    let tokenShardNumbersCache = new TokenShardNumbersCache({
      tokenId: oThis.tokenId
    });

    let response = await tokenShardNumbersCache.fetch();
    if (response.isFailure()) {
      return Promise.reject(response);
    }
    oThis.tokenShardDetails = response.data;
  }

  /**
   *
   * @private
   */
  async _fetchUserDetails() {
    const oThis = this;

    let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_b_u_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    oThis.userData = cacheFetchRsp.data[oThis.userId];
  }

  /**
   *
   * @private
   */
  async _validateAccess() {
    const oThis = this;

    if (oThis.userData.status !== tokenUserConstants.activatedStatus) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_b_u_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_user_id']
        })
      );
    }

    if (
      oThis.userData.kind === tokenUserConstants.companyKind &&
      oThis.apiSignatureKind !== apiSignatureConstants.hmacKind
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_b_u_3',
          api_error_identifier: 'unauthorized_for_company_uuid',
          params_error_identifiers: ['invalid_user_id']
        })
      );
    }
  }

  /***
   *
   * @private
   */
  async _fetchTokenAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (getAddrRsp.isFailure()) {
      return Promise.reject(getAddrRsp);
    }

    oThis.tokenAddresses = getAddrRsp.data;
  }

  /**
   * fetch user sessions from cache
   *
   * @private
   */
  async _fetchBalanceFromCache() {
    const oThis = this;

    let UserBalanceCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCache'),
      userBalanceCache = new UserBalanceCache({
        chainId: oThis.auxChainId,
        shardNumber: oThis.tokenShardDetails[shardConstant.balanceEntityKind],
        erc20Address: oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
        tokenHolderAddresses: [oThis.userData.tokenHolderAddress]
      });

    let fetchBalanceRsp = await userBalanceCache.fetch();
    if (fetchBalanceRsp.isFailure()) {
      return Promise.reject(fetchBalanceRsp);
    }

    if (basicHelper.isEmptyObject(fetchBalanceRsp.data[oThis.userData.tokenHolderAddress])) {
      oThis.balanceDetails = {
        userId: oThis.userId,
        blockChainSettledBalance: '0',
        blockChainUnsettleDebits: '0',
        pessimisticSettledBalance: '0',
        updatedTimestamp: basicHelper.getCurrentTimestampInSeconds()
      };
    } else {
      oThis.balanceDetails = fetchBalanceRsp.data[oThis.userData.tokenHolderAddress];
      oThis.balanceDetails['userId'] = oThis.userId;
    }
  }

  /**
   * Format API response
   *
   * @return {*}
   * @private
   */
  _formatApiResponse() {
    const oThis = this;
    return responseHelper.successWithData({
      [resultType.balance]: oThis.balanceDetails
    });
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }

  get auxChainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }
}

InstanceComposer.registerAsShadowableClass(GetUserBalance, coreConstants.icNameSpace, 'GetUserBalance');

module.exports = {};
