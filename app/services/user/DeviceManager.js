'use strict';
/**
 * This service fetches the device manager details for given user id  .
 *
 * @module app/services/token/AggregatedDetails
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TokenDetailCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token');

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for token details.
 *
 * @class
 */
class DeviceManager extends ServiceBase {
  /**
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._getUserDetailsFromDdb();

    return Promise.resolve(responseHelper.successWithData(oThis.details));
  }

  /**
   * Fetch tokenId & token details for given client id
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    if (!oThis.clientId || oThis.clientId === undefined) {
      logger.error('Invalid client id.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_dm_1',
          api_error_identifier: 'invalid_client_id',
          debug_options: {
            clientId: oThis.clientId
          }
        })
      );
    }

    let cacheResponse = await new TokenDetailCache({ clientId: oThis.clientId }).fetch();

    logger.debug('cacheResponse------', cacheResponse);

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched token details.');
      return Promise.reject(cacheResponse);
    }

    oThis.tokenDetails = cacheResponse.data;

    oThis.tokenId = oThis.tokenDetails['id'];
  }

  /**
   * Get shard number for required tokenId
   *
   * @return {Promise<*>}
   * @private
   */
  async _getShardNumber() {
    const oThis = this;

    let TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardsNumberCacheRsp = await new TokenShardNumbersCache({ tokenId: oThis.tokenId }).fetch();

    logger.debug('tokenShardsNumberCacheRsp--------', tokenShardsNumberCacheRsp);

    return tokenShardsNumberCacheRsp.data[entityConst.device];
  }

  /**
   * Get user device managers details for given token id.
   *
   * @return {Promise<*|result>}
   */
  async _getUserDetailsFromDdb() {
    const oThis = this;

    let shardNumber = await oThis._getShardNumber(),
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    let tokenUserDetailsCache = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId],
        shardNumber: shardNumber
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCache.fetch();

    logger.debug('tokenUserDetailsCacheRsp--------', tokenUserDetailsCacheRsp);

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('Could not fetched token user details.');
      Promise.reject(tokenUserDetailsCacheRsp);
    }

    oThis.details = tokenUserDetailsCacheRsp.data;

    logger.debug('oThis.details---------', oThis.details);
  }

  async _getContractData() {
    const oThis = this;

    //add requirement and nonce to output from multisig contract
  }
}

InstanceComposer.registerAsShadowableClass(DeviceManager, coreConstants.icNameSpace, 'DeviceManager');
