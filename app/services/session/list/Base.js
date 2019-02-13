'use strict';

/**
 *  Fetch session details by userId and addresses.
 *
 * @module app/services/session/list/Base
 */

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');
require(rootPrefix + '/lib/cacheManagement/chain/BlockTimeDetails');

const BigNumber = require('bignumber.js');

class SessionListBase extends ServiceBase {
  /**
   * @param params
   * @param {String}   params.user_id - uuid
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;

    oThis.addresses = [];
    oThis.nextPagePayload = null;
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._sanitizeParams();

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    await oThis._setAddresses();

    let response = await oThis._getUserSessionsDataFromCache();

    let returnData = {
      [resultType.sessions]: response.data
    };

    if (oThis.nextPagePayload) {
      returnData[resultType.nextPagePayload] = oThis.nextPagePayload;
    }

    return responseHelper.successWithData(returnData);
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   * @private
   */
  _sanitizeParams() {
    const oThis = this;
    oThis.userId = oThis.userId.toLowerCase();
  }

  /**
   * @private
   */
  _setAddresses() {
    throw 'sub class to implement and set oThis.addresses';
  }

  /**
   * Add expiration timestamp to session details
   *
   * @private
   */
  async _addExpirationTime(response) {
    const oThis = this,
      finalResponse = {},
      BlockTimeDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockTimeDetailsCache'),
      blockTimeDetailsCache = new BlockTimeDetailsCache({});

    let blockDetails = await blockTimeDetailsCache.fetch(),
      blockGenerationTimeInSecs = blockDetails.data.blockGenerationTime;

    for (let address in response.data) {
      let sessionData = response.data[address];

      let blockDifference = parseInt(sessionData.expirationHeight) - parseInt(blockDetails.data.block),
        blockDifferenceBn = new BigNumber(blockDifference),
        blockGenerationTimeInSecsBn = new BigNumber(blockGenerationTimeInSecs),
        timeDifferenceInSecsBn = blockDifferenceBn.mul(blockGenerationTimeInSecsBn),
        blockTimestampBn = new BigNumber(blockDetails.data.createdTimestamp),
        approxTime = blockTimestampBn.add(timeDifferenceInSecsBn);

      sessionData['expirationTimestamp'] = approxTime.toString(10);

      finalResponse[address] = sessionData;
    }

    return responseHelper.successWithData(finalResponse);
  }

  /**
   * Get session details of a user from a multi cache
   *
   * @returns {Promise<*|result>}
   */
  async _getUserSessionsDataFromCache() {
    const oThis = this;

    let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        addresses: oThis.addresses
      }),
      response = await sessionsByAddressCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    response = await oThis._addExpirationTime(response);

    return response;
  }
}

module.exports = SessionListBase;
