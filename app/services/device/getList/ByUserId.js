'use strict';

/**
 *  Fetch device details by userId.
 *
 * @module app/services/device/getList/ByUserId
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  GetListBase = require(rootPrefix + '/app/services/device/getList/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chain/WalletAddressesByUserId');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to list devices by userId.
 *
 * @class ListByUserId
 */
class ListByUserId extends GetListBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {Integer} [params.token_id]
   * @param {String} [params.pagination_identifier] - pagination identifier to fetch page
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.paginationIdentifier = params[paginationConstants.paginationIdentifierKey];

    oThis.paginationParams = null;
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   * @private
   */
  _sanitizeParams() {
    const oThis = this;

    super._sanitizeParams();

    if (oThis.paginationIdentifier) {
      oThis.paginationParams = basicHelper.decryptNextPagePayload(oThis.paginationIdentifier);
      if (!CommonValidators.validateDdbNextPagePayload(oThis.paginationParams)) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 's_d_gl_bui_1',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_pagination_identifier'],
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * @private
   */
  async _setWalletAddresses() {
    const oThis = this;

    let response;

    if (oThis.paginationParams && oThis.paginationParams.lastEvaluatedKey) {
      response = await oThis._fetchFromDdb();
    } else {
      response = await oThis._fetchFromCache();
    }

    oThis.walletAddresses = response.data['walletAddresses'];
    oThis.nextPagePayload = response.data['nextPagePayload'];
  }

  async _fetchFromDdb() {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');

    let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_gl_bui_2',
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
}

InstanceComposer.registerAsShadowableClass(ListByUserId, coreConstants.icNameSpace, 'DeviceListByUserId');

module.exports = {};
