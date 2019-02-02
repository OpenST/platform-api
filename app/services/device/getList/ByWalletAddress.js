'use strict';

/**
 *  Fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/getList/ByWalletAddress
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 *
 * @class ByWalletAddress
 */
class ByWalletAddress {
  /**
   * @param params
   * @param {Number} params.userId
   * @param {String} params.address
   * @param {Integer} params.tokenId
   */
  constructor(params) {
    const oThis = this;
    oThis.userId = params.userId;
    oThis.address = params.address;
    oThis.tokenId = params.tokenId;

    oThis.walletAddresses = [];
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of app/services/device/getList/ByWalletAddress');

      return responseHelper.error({
        internal_error_identifier: 'a_s_d_gl_bwa',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: err.toString()
      });
    });
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitize();

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

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   * @private
   */
  _validateAndSanitize() {
    const oThis = this,
      addresses = oThis.address.split(',');

    for (let index = 0; index < addresses.length; index++) {
      if (!CommonValidator.validateEthAddress(addresses[index])) {
        return responseHelper.error({
          internal_error_identifier: 'a_s_d_gl_bwa_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { address: addresses[index] }
        });
      } else {
        oThis.walletAddresses.push(addresses[index].toLowerCase());
      }
    }
  }
}

InstanceComposer.registerAsShadowableClass(ByWalletAddress, coreConstants.icNameSpace, 'ByWalletAddress');

module.exports = {};
