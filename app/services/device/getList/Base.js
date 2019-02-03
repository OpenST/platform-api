'use strict';

/**
 *  Fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/getList/Base
 */

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

class GetListBase {
  constructor(params) {
    const oThis = this;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async getList() {
    const oThis = this;

    let DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        walletAddresses: oThis.walletAddresses
      }),
      response = await deviceDetailCache.fetch(),
      responseData = response.data,
      formattedData = [];

    for (let walletAddress in responseData) {
      let row = responseData[walletAddress];

      formattedData.push(
        new DeviceFormatter({
          userId: row.userId,
          deviceUuid: row.deviceUuid,
          status: row.status,
          updatedTimestamp: row.updatedTimestamp,
          walletAddress: row.walletAddress,
          deviceName: row.deviceName,
          personalSignAddress: row.personalSignAddress
        }).perform()
      );
    }

    return responseHelper.successWithData(formattedData);
  }
}

module.exports = GetListBase;
