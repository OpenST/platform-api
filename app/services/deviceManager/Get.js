'use strict';
/**
 * This service fetches the device manager details for given user id  .
 *
 * @module app/services/deviceManager/Get
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/nonce/contract/MultiSig');

/**
 * Class for manager details.
 *
 * @class
 */
class Get extends ServiceBase {
  /**
   *
   * @constructor
   *
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateTokenStatus();

    await oThis._getUserDetailsFromCache();

    await oThis._fetchContractNonce();

    return Promise.resolve(responseHelper.successWithData({ [resultType.deviceManager]: oThis.details }));
  }

  /**
   * Get user device managers details for given token id.
   *
   * @return {Promise<*|result>}
   */
  async _getUserDetailsFromCache() {
    const oThis = this;

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    let tokenUserDetailsCache = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCache.fetch();

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('Could not fetched token user details.');
      Promise.reject(tokenUserDetailsCacheRsp);
    }

    oThis.details = tokenUserDetailsCacheRsp.data[oThis.userId];

    if (!CommonValidators.validateObject(oThis.details)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_g_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    if (oThis.details.status != tokenUserConstants.activatedStatus) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_g_2',
          api_error_identifier: 'user_not_activated',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch nonce from contract
   *
   * @private
   */
  async _fetchContractNonce() {
    const oThis = this;

    let MultiSigNonceKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'MultiSigNonce'),
      auxChainId = oThis.ic().configStrategy.auxGeth.chainId,
      params = { auxChainId: auxChainId, tokenId: oThis.tokenId, userId: oThis.userId };

    await new MultiSigNonceKlass(params)
      .perform()
      .then(function(resp) {
        if (resp.isSuccess()) {
          oThis.details.nonce = resp.data.nonce;
          // For now as Requirement is one, we have avoided call from contract to fetch requirement.
          oThis.details.requirement = contractConstants.multiSigRequirement;
        }
      })
      .catch(function(err) {
        logger.error(err);
      });
  }
}

InstanceComposer.registerAsShadowableClass(Get, coreConstants.icNameSpace, 'GetDeviceManager');
