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
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
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
   * @param {integer} [params.limit] - number of results to be returned on this page
   * @param {String} params.pagination_identifier - pagination identifier to fetch page
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.limit = params.limit;
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];
    oThis.paginationParams = null;
    oThis.defaultDeviceListPageSize = pagination.defaultDeviceListPageSize;
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
            internal_error_identifier: 's_d_glb_uid_1',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_pagination_identifier'],
            debug_options: {}
          })
        );
      }
    }

    let limitVas = CommonValidators.validateAndSanitizeLimit(
      oThis.limit,
      oThis.defaultDeviceListPageSize,
      pagination.maxDeviceListPageSize
    );

    if (!limitVas[0]) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_d_glb_uid_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_pagination_limit'],
          debug_options: {}
        })
      );
    }

    oThis.limit = limitVas[1];
  }

  /**
   * @private
   */
  async _setWalletAddresses() {
    const oThis = this;

    let response;

    if (oThis.paginationParams || oThis.limit !== oThis.defaultDeviceListPageSize) {
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
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch(),
      userData = cacheFetchRsp.data[oThis.userId];

    let deviceObj = new DeviceModel({ shardNumber: userData['deviceShardNumber'] });

    let lastEvaluatedKey = oThis.paginationParams ? oThis.paginationParams.lastEvaluatedKey : '';

    return deviceObj.getWalletAddresses(oThis.userId, oThis.limit, lastEvaluatedKey);
  }

  /**
   *
   * @private
   */
  async _fetchFromCache() {
    const oThis = this;

    let WalletAddressesByUserId = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'WalletAddressesByUserId'),
      walletAddressesByUserId = new WalletAddressesByUserId({
        userId: oThis.userId,
        tokenId: oThis.tokenId
      });

    return walletAddressesByUserId.fetch();
  }
}

InstanceComposer.registerAsShadowableClass(ListByUserId, coreConstants.icNameSpace, 'DeviceListByUserId');

module.exports = {};
