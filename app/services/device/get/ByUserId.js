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
  pagination = require(rootPrefix + '/lib/globalConstant/pagination');

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
   * @param {String} [params.addresses]: Array of wallet addresses
   * @param {Integer} [params.limit]
   * @param {String} [params.pagination_identifier]: pagination identifier to fetch page
   *
   * @augments GetListBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.addresses = params.addresses || [];
    oThis.limit = params.limit || oThis._defaultPageLimit();
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];

    oThis.walletAddresses = [];
    oThis.lastEvaluatedKey = null;
    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    await super._validateAndSanitizeParams();

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      let parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.addresses = [];
      oThis.limit = parsedPaginationParams.limit; //override limit
      oThis.lastEvaluatedKey = parsedPaginationParams.lastEvaluatedKey;
    }

    // Validate addresses length
    if (oThis.addresses && oThis.addresses.length > oThis._maxPageLimit()) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_gl_buid_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['addresses_more_than_allowed_limit'],
          debug_options: {}
        })
      );
    }

    //Validate limit
    return await oThis._validatePageSize();
  }

  /**
   * Set wallet addresses.
   *
   * Sets oThis.walletAddresses
   *
   * @private
   */
  async _setWalletAddresses() {
    const oThis = this;

    if (!oThis.addresses || oThis.addresses.length === 0) {
      let response;

      if (oThis.lastEvaluatedKey) {
        response = await oThis._fetchFromDdb();
      } else {
        response = await oThis._fetchFromCache();
      }

      oThis.walletAddresses = response.data.walletAddresses;
      oThis.responseMetaData[pagination.nextPagePayloadKey] = response.data[pagination.nextPagePayloadKey] || {};
    } else {
      for (let index = 0; index < oThis.addresses.length; index++) {
        oThis.walletAddresses.push(basicHelper.sanitizeAddress(oThis.addresses[index]));
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
      deviceObj = new DeviceModel({ shardNumber: userData['deviceShardNumber'] });

    return deviceObj.getWalletAddresses(oThis.userId, oThis._currentPageLimit(), oThis.lastEvaluatedKey);
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
        tokenId: oThis.tokenId,
        limit: oThis._currentPageLimit()
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

    let finalResponse = response.data,
      linkedAddressesMap = await oThis._fetchLinkedDeviceAddressMap();

    for (let deviceUuid in finalResponse) {
      let device = finalResponse[deviceUuid];
      if (!CommonValidators.validateObject(device)) {
        continue;
      }
      let deviceAddress = device.walletAddress;
      finalResponse[deviceUuid].linkedAddress = linkedAddressesMap[deviceAddress];
    }

    const returnData = {
      [resultType.devices]: finalResponse,
      [resultType.meta]: oThis.responseMetaData
    };

    return returnData;
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultDeviceListPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minDeviceListPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxDeviceListPageSize;
  }

  /**
   * _currentPageLimit
   *
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }
}

InstanceComposer.registerAsShadowableClass(ListByUserId, coreConstants.icNameSpace, 'DeviceByUserId');

module.exports = {};
