'use strict';
/**
 *  Fetch device details by userId.
 *
 * @module app/services/device/get/ByUserId
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  GetListBase = require(rootPrefix + '/app/services/device/get/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/WalletAddressesByUserId');

/**
 * Class to list devices by userId.
 *
 * @class ListByUserId
 */
class ListByUserId extends GetListBase {
  /**
   * Constructor to list devices by userId.
   *
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id: uuid
   * @param {Integer} [params.token_id]
   * @param {String} [params.pagination_identifier]: pagination identifier to fetch page
   * @param {String} [params.addresses]: Array of wallet addresses
   *
   * @sets oThis.paginationIdentifier
   * @sets oThis.addresses
   *
   * @augments GetListBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.paginationIdentifier = params[paginationConstants.paginationIdentifierKey];
    oThis.addresses = params.addresses || [];

    oThis.paginationParams = null;
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  _sanitizeParams() {
    const oThis = this;

    super._sanitizeParams();

    if (oThis.paginationIdentifier) {
      oThis.paginationParams = basicHelper.decryptNextPagePayload(oThis.paginationIdentifier);
    }

    if (oThis.addresses.length > paginationConstants.maxDeviceListPageSize) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_gl_buid_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_filter_address'],
          debug_options: { addresses: oThis.addresses }
        })
      );
    }
  }

  /**
   * Set wallet addresses.
   *
   * @private
   */
  async _setWalletAddresses() {
    const oThis = this;

    if (!oThis.addresses || oThis.addresses.length === 0) {
      let response;

      if (oThis.paginationParams && oThis.paginationParams.lastEvaluatedKey) {
        response = await oThis._fetchFromDdb();
      } else {
        response = await oThis._fetchFromCache();
      }

      oThis.walletAddresses = response.data['walletAddresses'];
      oThis.nextPagePayload = response.data['nextPagePayload'];
    } else {
      for (let index = 0; index < oThis.addresses.length; index++) {
        oThis.walletAddresses.push(oThis.addresses[index].toLowerCase());
      }
    }
  }

  /**
   * Fetch from DB.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fetchFromDdb() {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');

    let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_gl_buid_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    const userData = cacheFetchRsp.data[oThis.userId],
      deviceObj = new DeviceModel({ shardNumber: userData['deviceShardNumber'] }),
      lastEvaluatedKey = oThis.paginationParams ? oThis.paginationParams.lastEvaluatedKey : '';

    return deviceObj.getWalletAddresses(oThis.userId, paginationConstants.defaultDeviceListPageSize, lastEvaluatedKey);
  }

  /**
   * Fetch wallet addresses from cache.
   *
   * @private
   */
  async _fetchFromCache() {
    const oThis = this;

    let WalletAddressesByUserIdKlass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'WalletAddressesByUserId'),
      walletAddressesByUserId = new WalletAddressesByUserIdKlass({
        userId: oThis.userId,
        tokenId: oThis.tokenId
      });

    return walletAddressesByUserId.fetch();
  }

  /**
   * Get user device data from cache.
   *
   * @returns {Promise<*|result>}
   */
  async _getUserDeviceDataFromCache() {
    const oThis = this;

    let DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        walletAddresses: oThis.walletAddresses
      }),
      response = await deviceDetailCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    const returnData = {
      [resultType.devices]: response.data
    };

    if (oThis.nextPagePayload) {
      returnData[resultType.nextPagePayload] = oThis.nextPagePayload;
    }

    return returnData;
  }
}

InstanceComposer.registerAsShadowableClass(ListByUserId, coreConstants.icNameSpace, 'DeviceByUserId');

module.exports = {};
